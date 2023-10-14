package com.filipkin.ftahelper.ui.flashcards;

import androidx.lifecycle.ViewModelProvider;

import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import com.filipkin.ftahelper.R;

public class FlashcardsFragment extends Fragment {

    private FlashcardsViewModel mViewModel;

    public static FlashcardsFragment newInstance() {
        return new FlashcardsFragment();
    }

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_flashcards, container, false);
    }
}