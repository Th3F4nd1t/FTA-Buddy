package com.filipkin.ftahelper.ui.notes;

import android.annotation.SuppressLint;
import android.content.SharedPreferences;
import android.database.DataSetObserver;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.Observer;
import androidx.lifecycle.ViewModelProvider;

import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Spinner;
import android.widget.Toast;

import com.filipkin.ftahelper.databinding.FragmentNotesBinding;
import com.filipkin.ftahelper.util.Fetch;

import org.json.JSONArray;
import org.json.JSONException;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.Objects;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Response;


public class NotesFragment extends Fragment {

    private FragmentNotesBinding binding;
    private NotesViewModel notesViewModel;

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        notesViewModel = new ViewModelProvider(this).get(NotesViewModel.class);

        binding = FragmentNotesBinding.inflate(inflater, container, false);
        View root = binding.getRoot();

        SharedPreferences sharedPreferences = requireContext().getSharedPreferences("eventCode", 0);
        String eventCode = sharedPreferences.getString("eventCode", null);
        if (eventCode == null) {
            return root;
        }

        @SuppressLint("SetTextI18n")
        final Observer<String[]> teamsObserver = newTeams -> {
            Spinner spinner = binding.teamSelector;
            spinner.setAdapter(new ArrayAdapter<String>(root.getContext(),  android.R.layout.simple_spinner_dropdown_item, newTeams));
        };

        notesViewModel.getTeams().observe(getViewLifecycleOwner(), teamsObserver);

        try {
            Fetch.get("https://ftahelper.filipkin.com/teams/" + URLEncoder.encode(eventCode, "UTF-8"), new Callback() {
                @Override
                public void onFailure(@NonNull Call call, @NonNull IOException e) {
                    requireActivity().runOnUiThread(() -> Toast.makeText(getContext(), "Error connecting to cloud server", Toast.LENGTH_LONG).show());
                }

                @Override
                public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                    try {
                        JSONArray teamsArray = new JSONArray(response.body().string());

                        String[] teams = new String[teamsArray.length()];
                        for(int i = 0; i < teamsArray.length(); i++) {
                            teams[i] = Integer.toString(teamsArray.getInt(i));
                        }

                        requireActivity().runOnUiThread(() -> notesViewModel.getTeams().setValue(teams));
                    } catch (JSONException e) {
                        requireActivity().runOnUiThread(() -> Toast.makeText(getContext(), "Error getting teams list from cloud", Toast.LENGTH_LONG).show());
                    }
                }
            });
        } catch (UnsupportedEncodingException e) {
            Log.e("Notes", Objects.requireNonNull(e.getMessage()));
        }

        return root;
    }
}