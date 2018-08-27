package com.example.igudav.somm;

import android.content.res.Resources;
import android.graphics.Canvas;
import android.opengl.Matrix;
import android.view.SurfaceHolder;

public class DrawThread extends Thread {

    private boolean isRunning = false;
    private SurfaceHolder surfaceHolder;
    private Matrix matrix;
    private long prevTime;

    public DrawThread (SurfaceHolder surfaceHolder, Resources resources) {

        this.surfaceHolder = surfaceHolder;

        prevTime = System.currentTimeMillis();

    }

    public void setRunning(boolean run) {
        this.isRunning = run;
    }

    @Override
    public void run() {
        Canvas canvas;

        while (isRunning) {

        }

    }
}
