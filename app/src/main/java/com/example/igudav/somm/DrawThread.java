package com.example.igudav.somm;

import android.content.res.Resources;
import android.graphics.Canvas;
import android.graphics.Paint;
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
        Canvas canvas = null;
        prevTime = System.currentTimeMillis();
        Map.initGraphics();

        while (isRunning) {
            long curTime = System.currentTimeMillis();
            if (curTime - prevTime >= 1000 / 60) {
                prevTime = curTime;
                try {
                    canvas = surfaceHolder.lockCanvas(null);
                    synchronized (surfaceHolder) {
                        Paint p = new Paint();
                        p.setStyle(Paint.Style.FILL);
                        p.setARGB(255, 255, 255, 255);
                        canvas.drawRect(canvas.getClipBounds(), p);
                        Map.drawArrows(canvas, 100, 100, 0);
                    }
                } finally {
                    if (canvas != null) {
                        surfaceHolder.unlockCanvasAndPost(canvas);
                    }
                }
            }
        }

    }
}
