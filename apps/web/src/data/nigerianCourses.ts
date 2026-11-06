// Undergraduate programmes grouped by faculty, following the NUC Core Curriculum and
// Minimum Academic Standards (CCMAS, 2022) disciplines. NUC does not publish a per-university
// list, so coursesForUniversity narrows the catalogue by the kind of university instead.
// Students whose course is missing can still pick "Other" and type it.

export type Faculty =
  | "Administration and Management"
  | "Agriculture"
  | "Allied Health Sciences"
  | "Arts"
  | "Basic Medical Sciences"
  | "Communication and Media Studies"
  | "Computing"
  | "Dentistry"
  | "Education"
  | "Engineering and Technology"
  | "Environmental Sciences"
  | "Law"
  | "Medicine and Surgery"
  | "Pharmaceutical Sciences"
  | "Sciences"
  | "Social Sciences"
  | "Veterinary Medicine"
  | "Maritime, Transport and Aviation"
  | "Security and Defence Studies";

export const coursesByFaculty: Record<Faculty, string[]> = {
  "Administration and Management": [
    "Accounting", "Actuarial Science", "Banking and Finance", "Business Administration", "Cooperative and Rural Development",
    "Employment Relations and Human Resource Management", "Entrepreneurship", "Finance", "Hospitality Management", "Insurance",
    "Marketing", "Office and Information Management", "Public Administration", "Taxation", "Tourism Studies",
    "Procurement Management", "Local Government and Development Studies", "Project Management Technology",
  ],
  Agriculture: [
    "Agriculture", "Agricultural Economics", "Agricultural Extension and Rural Development", "Agribusiness", "Agronomy",
    "Animal Science", "Animal Production and Health", "Aquaculture and Fisheries Management", "Crop Science", "Crop Protection",
    "Family and Consumer Sciences", "Fisheries", "Food Science and Technology", "Forestry and Wildlife Management",
    "Home Science and Management", "Horticulture", "Plant Breeding and Seed Technology", "Soil Science", "Water Resources Management and Agrometeorology",
  ],
  "Allied Health Sciences": [
    "Audiology", "Dental Technology", "Dental Therapy", "Environmental Health Science", "Health Information Management",
    "Human Nutrition and Dietetics", "Medical Laboratory Science", "Nursing Science", "Occupational Therapy", "Optometry",
    "Physiotherapy", "Prosthetics and Orthotics", "Public Health", "Radiography and Radiation Science", "Speech and Language Therapy",
    "Community Health",
  ],
  Arts: [
    "Arabic Studies", "Christian Religious Studies", "Creative Arts", "Dance", "English Language", "English and Literary Studies",
    "Fine and Applied Arts", "French", "German", "History and International Studies", "Igbo", "Islamic Studies", "Hausa",
    "Linguistics", "Music", "Philosophy", "Portuguese", "Religious Studies", "Theatre and Film Studies", "Yoruba", "Chinese Studies",
    "Russian", "Archaeology", "Edo", "Efik/Ibibio",
  ],
  "Basic Medical Sciences": ["Anatomy", "Human Physiology", "Medical Biochemistry", "Pharmacology", "Physiology"],
  "Communication and Media Studies": [
    "Mass Communication", "Advertising", "Broadcasting", "Development Communication Studies", "Film and Multimedia Studies",
    "Information and Media Studies", "Journalism and Media Studies", "Public Relations",
  ],
  Computing: ["Computer Science", "Cyber Security", "Data Science", "Information Systems", "Information Technology", "Software Engineering", "Artificial Intelligence"],
  Dentistry: ["Dentistry and Dental Surgery"],
  Education: [
    "Adult Education", "Agricultural Education", "Biology Education", "Business Education", "Chemistry Education",
    "Computer Science Education", "Early Childhood Education", "Economics Education", "Educational Management",
    "Educational Technology", "English Education", "Guidance and Counselling", "Health Education", "Home Economics Education",
    "Human Kinetics", "Integrated Science Education", "Library and Information Science", "Mathematics Education",
    "Physics Education", "Primary Education", "Social Studies Education", "Special Education", "Technical Education",
    "Vocational Education", "Christian Religious Studies Education", "Islamic Studies Education", "French Education",
    "History Education", "Geography Education", "Fine and Applied Arts Education", "Music Education", "Yoruba Education",
    "Igbo Education", "Hausa Education", "Physical and Health Education", "Political Science Education", "Arabic Education",
  ],
  "Engineering and Technology": [
    "Aeronautical and Aerospace Engineering", "Agricultural and Bio-Resources Engineering", "Automotive Engineering",
    "Biomedical Engineering", "Chemical Engineering", "Civil Engineering", "Computer Engineering", "Electrical and Electronics Engineering",
    "Electronics Engineering", "Food Science and Engineering", "Industrial and Production Engineering", "Marine Engineering",
    "Mechanical Engineering", "Mechatronics Engineering", "Metallurgical and Materials Engineering", "Mining Engineering",
    "Petroleum Engineering", "Gas Engineering", "Polymer and Textile Engineering", "Structural Engineering", "Telecommunication Engineering",
    "Water Resources and Environmental Engineering", "Systems Engineering", "Information and Communication Engineering",
    "Robotics Engineering",
  ],
  "Environmental Sciences": [
    "Architecture", "Building", "Estate Management", "Environmental Management", "Fine Arts and Design", "Industrial Design",
    "Quantity Surveying", "Surveying and Geoinformatics", "Urban and Regional Planning", "Landscape Architecture", "Interior Architecture",
  ],
  Law: ["Law", "Civil Law", "Common Law", "Islamic Law", "Sharia"],
  "Medicine and Surgery": ["Medicine and Surgery"],
  "Pharmaceutical Sciences": ["Pharmacy", "Doctor of Pharmacy (Pharm.D)"],
  Sciences: [
    "Applied Geophysics", "Biochemistry", "Biology", "Biotechnology", "Botany", "Chemistry", "Environmental Science",
    "Geography", "Geology", "Geophysics", "Industrial Chemistry", "Industrial Mathematics", "Marine Science", "Mathematics",
    "Meteorology", "Microbiology", "Petroleum Chemistry", "Physics", "Plant Science and Biotechnology", "Statistics",
    "Zoology", "Forensic Science", "Applied Biology", "Industrial Physics", "Biophysics", "Electronics and Physics",
  ],
  "Social Sciences": [
    "Criminology and Security Studies", "Demography and Social Statistics", "Economics", "Geography and Regional Planning",
    "International Relations", "Peace and Conflict Studies", "Political Science", "Psychology", "Social Work", "Sociology",
    "Anthropology", "Development Studies", "Gender Studies", "Library and Information Science",
  ],
  "Veterinary Medicine": ["Veterinary Medicine"],
  "Maritime, Transport and Aviation": [
    "Aviation Management", "Air Transport Management", "Logistics and Supply Chain Management", "Marine Transportation",
    "Maritime Management Technology", "Maritime Transport and Business Studies", "Nautical Science", "Naval Architecture",
    "Port Management", "Transport Management", "Transport and Logistics", "Railway Engineering", "Flight Operations",
  ],
  "Security and Defence Studies": [
    "Defence and Strategic Studies", "Criminology and Security Studies", "Intelligence and Security Studies", "Military History",
    "Police Studies", "Forensic Science", "Cyber Security", "Peace and Conflict Studies",
  ],
};

export const allFaculties = Object.keys(coursesByFaculty) as Faculty[];

type Profile = { test: RegExp; faculties: Faculty[] };

// Checked in order, so the most specific kind of university wins.
const profiles: Profile[] = [
  {
    test: /medical|medicine|health science|allied/i,
    faculties: ["Medicine and Surgery", "Basic Medical Sciences", "Allied Health Sciences", "Pharmaceutical Sciences", "Dentistry", "Sciences", "Computing"],
  },
  {
    test: /police|defence|army|air force|naval/i,
    faculties: ["Security and Defence Studies", "Engineering and Technology", "Sciences", "Computing", "Social Sciences", "Arts", "Administration and Management", "Law"],
  },
  {
    test: /maritime|transport|aviation|aerospace/i,
    faculties: ["Maritime, Transport and Aviation", "Engineering and Technology", "Sciences", "Computing", "Administration and Management", "Environmental Sciences", "Social Sciences"],
  },
  {
    test: /petroleum|energy/i,
    faculties: ["Engineering and Technology", "Sciences", "Computing", "Environmental Sciences", "Administration and Management"],
  },
  {
    test: /agricultur/i,
    faculties: ["Agriculture", "Veterinary Medicine", "Sciences", "Computing", "Engineering and Technology", "Environmental Sciences", "Administration and Management", "Communication and Media Studies", "Social Sciences"],
  },
  {
    test: /education/i,
    faculties: ["Education", "Arts", "Sciences", "Social Sciences", "Computing", "Administration and Management"],
  },
  {
    test: /technology|polytechnic|science/i,
    faculties: ["Engineering and Technology", "Sciences", "Computing", "Environmental Sciences", "Administration and Management", "Agriculture", "Basic Medical Sciences", "Allied Health Sciences", "Communication and Media Studies", "Social Sciences"],
  },
];

export type CourseOption = { name: string; faculty: Faculty };

export function coursesForUniversity(university: string): CourseOption[] {
  const faculties = profiles.find((profile) => profile.test.test(university))?.faculties ?? allFaculties;
  const seen = new Set<string>();
  return faculties.flatMap((faculty) => coursesByFaculty[faculty]
    .filter((name) => !seen.has(name) && Boolean(seen.add(name)))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, faculty })));
}
