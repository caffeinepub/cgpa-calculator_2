import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Grade {
    credits: number;
    grade: number;
}
export interface backendInterface {
    calculate(grades: Array<Grade>): Promise<number>;
    gradeToPoint(letterGrade: string): Promise<number>;
}
