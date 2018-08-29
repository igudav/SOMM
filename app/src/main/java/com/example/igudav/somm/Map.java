package com.example.igudav.somm;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;

import java.util.ArrayList;

public class Map {

    enum State {
        MAPOVERVIEW,
        WAITINGCHOICE,
        MOVING,
        PAUSED,
        FINISHED,
        ATSTART
    }

    private static int grid = 20;
    private static int scale = 20;
    private ArrayList<MapNode> mMapNodes;
    private ArrayList<MapNode> mRouteNodes;
    private MapNode mDotNode;
    private int mDotFrom; // neighbor index
    private int mDotTo; // neighbor index
    private MapNode mSrcNode;
    private MapNode mDstNode;
    private double mDotI; // part of a way from one node to neighbor
    private Vec mDotPos;
    private double mDotAng;
    private State state;

    // graphics
    private static Path arrowPath;
    private static Paint arrowPaint;

    public static void set2DArray(int[][] arr, int value) {
        int len = arr.length;
        for (int i = 0; i < len; i++) {
            for (int j = 0; j < len; j++) {
                arr[i][j] = value;
            }
        }
    }

    public Map() {

        // O----------> x
        // |
        // |
        // |
        // |
        // V
        // y
        //1=up 2=dn 4=lf 8=rt
        int nodes[][] = new int[20][20];
        int[] dx = {0, 0, -1, 1};
        int[] dy = {-1, 1, 0, 0};

        Map.set2DArray(nodes, 15);

        // borders
        for (int i = 0; i < grid; i++) {
            nodes[i][0] &= ~1;
            nodes[i][grid - 1] &= ~2;
            nodes[0][i] &= ~4;
            nodes[grid - 1][i] &= ~8;
        }

        final double NODESDENSITY = 0.4;
        final double MAPCONNECTIVITY = 0.9;

        // randomly turn off some nodes
        for (int s = 2; s < 6; s++) {
            for (int x = 0; x < grid; x++) {
                for (int y = 0; y < grid; y++) {
                    if (Vec.rand() > NODESDENSITY) {
                        for (int a = 0; a < 4; a++) {
                            if ((nodes[x][y] & (1 << a)) != 0) {
                                nodes[x][y] &= ~(1 << a);
                                nodes[x + dx[a]][y + dy[a]] &= ~(1 << (a ^ 1));
                            }
                        }
                    }
                }
            }
        }

        // randomly turn off some edges
        for (int x = 0; x < grid; x++) {
            for (int y = 0; y < grid; y++) {
                for (int a = 0; a < 4; a++) {
                    if ((nodes[x][y] & (1 << a)) != 0) {
                        if (Vec.rand() > MAPCONNECTIVITY) {
                            nodes[x][y] &= ~(1 << a);
                            nodes[x + dx[a]][y + dy[a]] &= ~(1 << (a ^ 1));
                        }
                    }
                }
            }
        }

        // remove any nodes that have only one neighbor
        boolean busy = true;
        while (busy) {
            busy = false;
            for (int x = 0; x < grid; x++) {
                for (int y = 0; y < grid; y++) {
                    int cnt = 0;
                    for (int a = 0; a < 4; a++) {
                        if ((nodes[x][y] & (1 << a)) != 0) {
                            ++cnt;
                        }
                    }
                    if (cnt == 1) {
                        for (int a = 0; a < 4; a++) {
                            if ((nodes[x][y] & (1 << a)) != 0) {
                                nodes[x][y] &= ~(1 << a);
                                nodes[x + dx[a]][y + dy[a]] &= ~(1 << (a ^ 1));
                            }
                        }
                        busy = true;
                    }
                }
            }
        }

        // the grid may be disconnected, check it. Find a start node and
        // fill from it.
        boolean[][] mark = new boolean[grid][grid];
        int startNode = 1;
        while (startNode != 0) {

            for (int i = 0; i < grid; i++) {
                for (int j = 0; j < grid; j++) {
                    mark[i][j] = false;
                }
            }

            // find start node
            int sn = startNode;
            for (int x = 0; x < grid; x++) {
                for (int y = 0; y < grid; y++) {
                    if (nodes[x][y] != 0 && --sn == 0) {
                        mark[x][y] = true;
                        x = y = grid;
                    }
                }
            }

            busy = true;
            while (busy) {
                busy = false;
                for (int x = 0; x < grid; x++) {
                    for (int y = 0; y < grid; y++) {
                        if (mark[x][y]) {
                            for (int a = 0; a < 4; a++) {
                                if((nodes[x][y] & (1 << a)) != 0) {
                                    if (!mark[x + dx[a]][y + dy[a]]) {
                                        mark[x + dx[a]][y + dy[a]] = true;
                                        busy = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // count rested nodes
            int cnt = 0;
            for (int x = 0; x < grid; x++) {
                for (int y = 0; y < grid; y++) {
                    if (mark[x][y]) {
                        ++cnt;
                    }
                }
            }

            if (cnt > grid * grid / 10) {
                break;
            }
            ++startNode;
        }

        // remove anything thats not marked
        for (int x = 0; x < grid; x++) {
            for (int y = 0; y < grid; y++) {
                if (!mark[x][y]) {
                    for(int a = 0; a < 4; a++) {
                        if ((nodes[x][y] & (1 << a)) != 0) {
                            nodes[x][y] &= ~(1 << a);
                            nodes[x + dx[a]][y + dy[a]] &= ~(1 << (a ^ 1));
                        }
                    }
                }
            }
        }

        // move around
        Vec[][] xy = new Vec[grid][grid];
        for (int x = 0; x < grid; x++) {
            for (int y = 0; y < grid; y++) {
                xy[x][y] = new Vec(x + Vec.randRange(-0.4, 0.4),
                        y + Vec.randRange(-0.4, 0.4));
            }
        }

        // spiral the points (i hope stupid copy-paste will work)
        for (int xx = 0; xx < grid; xx += 15) {
            for (int yy = 0; yy < grid; yy += 15) {
                Vec center = new Vec(xx, yy);
                double rad = Vec.randRange(6, 8); // rotation radius mb?
                double ang = Vec.randRange(0.7, 1.2) * (Vec.rand() > 0.5 ? 1 : -1);
                for (int x = 0; x < grid; x++) {
                    for (int y = 0; y < grid; y++) {
                        Vec p = Vec.sub(xy[x][y], center);
                        double d = p.length() / rad;
                        double a = ang * Vec.clamp(d, 0.5, 1);
                        Vec o = new Vec(Math.cos(a) * p.getX() - Math.sin(a) * p.getY(),
                                Math.sin(a) * p.getX() + Math.cos(a) * p.getY());
                        xy[x][y] = Vec.add(o, center);
                    }
                }
            }
        }

        MapNode[][] mapNodes = new MapNode[grid][grid];
        for (int x = 0; x < grid; x++) {
            for (int y = 0; y < grid; y++) {
                if (nodes[x][y] != 0) {
                    // in original here is used xy[][].copy(), but xy isn't used further
                    // so I decided to change it
                    mapNodes[x][y] = new MapNode(xy[x][y].multEq(scale));
                }
            }
        }

        // assign neighbors references
        for (int x = 0; x < grid; x++) {
            for (int y = 0; y < grid; y++) {
                for (int a = 0; a < 4; a++) {
                    if ((nodes[x][y] & (1 << a)) != 0) {
                        mapNodes[x][y].putNeighbor(mapNodes[x + dx[a]][y + dy[a]], a);
                    }
                }
            }
        }

        // calc center positions, copy valid ones to the main list
        mMapNodes = new ArrayList<>();
        for (int x = 0; x < grid; x++) {
            for (int y = 0; y < grid; y++) {
                if (mapNodes[x][y] != null) {
                    mapNodes[x][y].calcCenter();
                    mMapNodes.add(mapNodes[x][y]);
                }
            }
        }

        state = State.MAPOVERVIEW;
    }

    public void InitCourse() {

        mSrcNode = mMapNodes.get(Vec.randRangeInt(0, mMapNodes.size()));

        double dist = 0;
        while (dist < 3 * scale) {
            mDstNode = mMapNodes.get(Vec.randRangeInt(0, mMapNodes.size()));
            dist = Vec.sub(mDstNode.getCenter(), mSrcNode.getCenter()).length();
        }

        InitDot();
    }

    public void InitDot() {
        mRouteNodes.clear();

        mDotNode = mSrcNode;
        mDotFrom = mDotNode.getValidNeighborIdx(Vec.randRangeInt(1,4));
        mDotTo = mDotFrom;
        while (mDotTo == mDotFrom) {
            mDotTo = mDotNode.getValidNeighborIdx(Vec.randRangeInt(1,4));
        }
        mDotI = 0.5;
        updateDotPos();
        state = State.ATSTART;
    }

    public void updateDotPos() {

        Vec p1 = mDotNode.getNeighborPos(mDotFrom, 0.5);
        Vec p2 = mDotNode.getNeighborPos(mDotTo, 0.5);
        Vec c1 = Vec.interpolate(p1, mDotNode.getCenter(), 0.7);
        Vec c2 = Vec.interpolate(p2, mDotNode.getCenter(), 0.7);
        mDotPos = Vec.bezier(p1, c1, c2, p2, mDotI);
        Vec dir = Vec.sub(Vec.bezier(p1, c1, c2, p2,mDotI+0.001), mDotPos);
        mDotAng = Math.atan2(dir.getX(), dir.getY()) + Math.PI;
    }

    public static void initGraphics() {
        float arrowScale = 100;
        arrowPath = new Path();
        arrowPath.moveTo(0, -arrowScale);
        arrowPath.lineTo(-arrowScale * (float) 0.3, -arrowScale);
        arrowPath.lineTo(-arrowScale * (float) 0.2, 0);
        arrowPath.lineTo(-arrowScale * (float) 0.7, 0);
        arrowPath.lineTo(0, arrowScale);
        arrowPath.lineTo(arrowScale * (float) 0.7, 0);
        arrowPath.lineTo(arrowScale * (float) 0.2, 0);
        arrowPath.lineTo(arrowScale * (float) 0.3, -arrowScale);
        arrowPath.lineTo(0, -arrowScale);
        arrowPath.close();

        arrowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    }

    public static void drawArrows(Canvas canvas, double x, double y, double ang) {

        double c = Math.sin(System.currentTimeMillis() / 200) * 0.1 + 0.9;

        arrowPaint.setStyle(Paint.Style.FILL);
        arrowPaint.setARGB(255, (int) Math.floor(c * 255), (int) Math.floor(c * 128), 0);

        canvas.save();
        canvas.translate((float) x, (float) y);
        canvas.rotate((float) Math.toDegrees(ang));
        canvas.drawPath(arrowPath, arrowPaint);

        arrowPaint.setStyle(Paint.Style.STROKE);
        arrowPaint.setStrokeWidth(10);
        arrowPaint.setColor(Color.BLACK);

        canvas.drawPath(arrowPath, arrowPaint);

        canvas.restore();

    }

    public void draw(Canvas canvas) {

    }
}
