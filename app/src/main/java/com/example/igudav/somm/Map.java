package com.example.igudav.somm;

import android.widget.GridLayout;

public class Map {

    private static final int GRID = 20;
    private int[][] nodes;

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
        for (int i = 0; i < GRID; i++) {
            nodes[i][0] &= ~1;
            nodes[i][GRID - 1] &= ~2;
            nodes[0][i] &= ~4;
            nodes[GRID - 1][i] &= ~8;
        }

        final double NODESDENSITY = 0.4;
        final double MAPCONNECTIVITY = 0.9;

        // randomly turn off some nodes
        for (int s = 2; s < 6; s++) {
            for (int x = 0; x < GRID; x++) {
                for (int y = 0; y < GRID; y++) {
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
        for (int x = 0; x < GRID; x++) {
            for (int y = 0; y < GRID; y++) {
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
            for (int x = 0; x < GRID; x++) {
                for (int y = 0; y < GRID; y++) {
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
        boolean[][] mark = new boolean[GRID][GRID];
        int startNode = 1;
        while (startNode != 0) {

            for (int i = 0; i < GRID; i++) {
                for (int j = 0; j < GRID; j++) {
                    mark[i][j] = false;
                }
            }

            // find start node
            int sn = startNode;
            for (int x = 0; x < GRID; x++) {
                for (int y = 0; y < GRID; y++) {
                    if (nodes[x][y] != 0 && --sn == 0) {
                        mark[x][y] = true;
                        x = y = GRID;
                    }
                }
            }

            busy = true;
            while (busy) {
                busy = false;
                for (int x = 0; x < GRID; x++) {
                    for (int y = 0; y < GRID; y++) {
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
            for (int x = 0; x < GRID; x++) {
                for (int y = 0; y < GRID; y++) {
                    if (mark[x][y]) {
                        ++cnt;
                    }
                }
            }

            if (cnt > GRID * GRID / 10) {
                break;
            }
            ++startNode;
        }

        // remove anything thats not marked
        for (int x = 0; x < GRID; x++) {
            for (int y = 0; y < GRID; y++) {
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

        // TODO next is some graphics in original.js
    }
}
