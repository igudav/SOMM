package com.example.igudav.somm;

import java.math.*;

public class Vec {

    private double x;
    private double y;

    // constructors

    public Vec(double x, double y) {
        this.x = x;
        this.y = y;
    }

    public Vec(Vec other) {
        this.x = other.getX();
        this.y = other.getY();
    }

    // arithmetics

    public void addEq(Vec v) {
        this.x += v.getX();
        this.y += v.getY();
    }

    public void subEq(Vec v) {
        this.x -= v.getX();
        this.y -= v.getY();
    }

    public void multEq(double k) {
        this.x *= k;
        this.y *= k;
    }

    public void divEq(double k) {
        this.x /= k;
        this.y /= k;
    }

    public double length () {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    public double lengthSquared () {
        return this.x * this.x + this.y * this.y;
    }

    public static Vec interpolate (Vec a, Vec b, double k) {
        return new Vec(
                a.getX() + (b.getX() - a.getX()) * k,
                a.getY() + (b.getY() - a.getY()) * k);
    }

    public Vec add(Vec a, Vec b) {
        return new Vec (a.getX() + b.getX(), a.getY() + b.getY());
    }

    public Vec sub(Vec a, Vec b) {
        return new Vec (a.getX() - b.getX(), a.getY()- b.getY());
    }

    public Vec mul(Vec a, double k) {
        return new Vec (a.getX() * k, a.getY() * k);
    }

    public Vec div(Vec a, double k) {
        return new Vec (a.getX() / k, a.getY() / k);
    }

    public Vec bezier(Vec p1, Vec p2, Vec p3, Vec p4, double k) {

        double a = (1 - k) * (1 - k) * (1 - k);
        double b = 3 * (1 - k) * (1 - k) * k;
        double c = 3 * (1 - k) * k * k;
        double d = k * k * k;

        return new Vec(a * p1.getX() + b * p2.getX() + c * p3.getX() + d * p4.getX(),
                        a * p1.getY() + b * p2.getY() + c * p3.getY() + d * p4.getY());

    }

    public static double rand() {
        return Math.random();
    }

    public static double randRange(double a, double b) {
        return rand() * (b - a) + a;
    }

    public static int randRangeInt(int a, int b) {
        return (int) Math.floor(rand() * (b - a + 1) + a);
    }

    public static double clamp(double x, double a, double b) {
        return x < a ? a : (x > b ? b : x);
    }

    // get-set

    public double getX() {
        return x;
    }

    public void setX(double x) {
        this.x = x;
    }

    public double getY() {
        return y;
    }

    public void setY(double y) {
        this.y = y;
    }


}
