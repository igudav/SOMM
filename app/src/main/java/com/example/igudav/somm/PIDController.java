package com.example.igudav.somm;

/**
 * proportional-integral-derivative controller
 */
public class PIDController {

    private double kp;
    private double ki;
    private double kd;
    private double correction;
    private double prevErr;
    private double integral;

    public PIDController(double kp, double ki, double kd) {
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
        this.correction = this.prevErr = this.integral = 0;
    }

    public void reset() {
        this.correction = this.prevErr = this.integral = 0;
    }

    public double getCorrection() {
        return correction;
    }

    public double step(double dt, double error) {

        double prop = kp * error;
        this.integral += ki * error * dt;
        double deriv = kd * (error - prevErr) / dt;
        this.correction = prop + integral + deriv;
        this.prevErr = error;
        return correction;
    }
}
