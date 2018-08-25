package com.example.igudav.somm;

public class MapNode {

    private Vec pos;
    private MapNode[] neighbors = new MapNode[4]; // neighbor MapNodes
    private int neighborCnt = 0;
    private Vec center; // avg position of center and neighbors centers
    private int startNeighbor = Vec.randRangeInt(-5, 5);


    public MapNode(Vec pos) {
        this.pos = pos;
    }

    public int getValidNeighborIdx(int neighborNum) {
        int c = -1;
        while (neighborNum > 0) {
            if (++c >= 4) {
                c = 0;
            }
            if (this.neighbors[c] != null) {
                neighborNum--;
            }
        }
        return c;
    }

    public Vec getNeighborPos(int neighborIdx, double k) {
        return Vec.interpolate(this.center, this.neighbors[neighborIdx].center, k);
    }

    // TODO write drawing funcs (here?) and write updateDotPos in MapView
}
