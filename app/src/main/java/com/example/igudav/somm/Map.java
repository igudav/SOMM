package com.example.igudav.somm;

import java.util.ArrayList;

public class Map {

    private static int grid = 20;
    private static int scale = 20;
    private ArrayList<MapNode> mMapNodes;

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
    }


}
