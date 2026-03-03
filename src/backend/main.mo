import Runtime "mo:core/Runtime";
import Float "mo:core/Float";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Int "mo:core/Int";

actor {
  type Grade = {
    grade : Float;
    credits : Float;
  };

  public shared ({ caller }) func calculate(grades : [Grade]) : async Float {
    if (grades.size() == 0) { Runtime.trap("Input array must not be empty") };

    var totalCredits = 0.0;
    let totalGradePoints = grades.values().foldLeft(0.0, func(acc, grade) { totalCredits += grade.credits; acc + (grade.grade * grade.credits) });

    if (totalCredits == 0.0) { Runtime.trap("Total credits must be greater than 0.") };

    (totalGradePoints * 100).toInt().toFloat() / totalCredits / 100;
  };

  public shared ({ caller }) func gradeToPoint(letterGrade : Text) : async Float {
    switch (letterGrade) {
      case ("O") { 10.0 };
      case ("A+") { 9.0 };
      case ("A") { 8.0 };
      case ("B+") { 7.0 };
      case ("B") { 6.0 };
      case ("C") { 5.0 };
      case (_) { Runtime.trap("Unrecognized grade. Supported grades: 'O', 'A+', 'A', 'B+', 'B', 'C'.") };
    };
  };
};
