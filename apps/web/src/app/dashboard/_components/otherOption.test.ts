import assert from "node:assert/strict";
import test from "node:test";
import { OTHER, resolveOther } from "./otherOption";
import { allFaculties, coursesForUniversity } from "../../../data/nigerianCourses";

test("a listed option is saved as is", () => {
  assert.equal(resolveOther("Food", "ignored"), "Food");
});

test("Other is replaced by the typed description", () => {
  assert.equal(resolveOther(OTHER, "  Gym membership "), "Gym membership");
  assert.equal(resolveOther(OTHER, "   "), "");
});

test("a comprehensive university lists every faculty", () => {
  const faculties = new Set(coursesForUniversity("University of Lagos").map((course) => course.faculty));
  assert.equal(faculties.size, allFaculties.length);
});

test("specialised universities list matching courses only", () => {
  const medical = coursesForUniversity("Eko University of Medical Sciences, Ijanikin, Lagos").map((course) => course.name);
  assert.ok(medical.includes("Medicine and Surgery"));
  assert.ok(!medical.includes("Law"));
  const agriculture = coursesForUniversity("Federal University of Agriculture, Abeokuta").map((course) => course.name);
  assert.ok(agriculture.includes("Animal Science"));
  const education = coursesForUniversity("Tai Solarin Federal University of Education, Ijagun, Ijebu Ode").map((course) => course.name);
  assert.ok(education.includes("Mathematics Education"));
  assert.ok(!education.includes("Medicine and Surgery"));
});

test("no course appears twice for one university", () => {
  for (const name of ["University of Ibadan", "Nigerian Defence Academy, Kaduna", "Federal University of Technology, Akure"]) {
    const courses = coursesForUniversity(name).map((course) => course.name);
    assert.equal(new Set(courses).size, courses.length, name);
  }
});
