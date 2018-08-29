package com.example.igudav.somm;

public class MapNode {

    private Vec pos;
    private MapNode[] neighbors; // neighbor MapNodes
    private int neighborCnt;
    private Vec center; // avg position of center and neighbors centers
    private int startNeighbor;


    MapNode(Vec pos) {
        this.pos = pos;
        neighborCnt = 0;
        neighbors = new MapNode[4];
        startNeighbor = Vec.randRangeInt(-5, 5);
    }

    public Vec getCenter() {
        return center;
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

    public void putNeighbor(MapNode node, int index) {
        neighbors[index] = node;
        ++neighborCnt;
    }

    public MapNode getNeighbor(int index) {
        return neighbors[index];
    }

    public void calcCenter() {
        this.center = new Vec(this.pos);
        for (int a = 0; a < 4; a++) {
            if (this.getNeighbor(a) != null) {
                Vec half = Vec.interpolate(this.pos, this.getNeighbor(a).pos, 0.5);
                this.center.addEq(half);
            }
        }
        this.center.divEq(neighborCnt + 1.0);

        if (this.neighborCnt == 2 && this.startNeighbor <= 0) {
            this.startNeighbor = 1;
        }
    }



    // TODO write drawing funcs (here?) and write updateDotPos in MapView
}
