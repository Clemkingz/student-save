// Source: https://enuc.nuc.edu.ng/nus (checked 2026-10-26).
// Check against the latest NUC list regularly: new universities are approved frequently.
export type NigerianUniversity = { name: string; type: "Federal" | "State" | "Private"; state?: string; abbreviation?: string };
export const nigerianUniversities: NigerianUniversity[] = [
  {
    "name": "ANAN University, Kwall, Plateau State",
    "type": "Private",
    "state": "Plateau"
  },
  {
    "name": "Abdulfattah Durojaiye University, Abeokuta",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "Abdulkadir Kure University, Minna, Niger State",
    "type": "State",
    "state": "Niger"
  },
  {
    "name": "Abdulrasaq Abubakar Toyin University, Oke-Agba, Kwara State",
    "type": "Private",
    "state": "Kwara"
  },
  {
    "name": "Abdulsalami Abubakar University of Agriculture and Climate Action, Mokwa, Niger State",
    "type": "State",
    "state": "Niger"
  },
  {
    "name": "Abia State University, Uturu",
    "type": "State",
    "state": "Abia"
  },
  {
    "name": "Abubakar Tafawa Balewa University, Bauchi",
    "type": "Federal",
    "state": "Bauchi"
  },
  {
    "name": "Achievers University, Owo, Ondo State",
    "type": "Private",
    "state": "Ondo"
  },
  {
    "name": "Adamawa State University, Mubi",
    "type": "State",
    "state": "Adamawa"
  },
  {
    "name": "Adeche Momoh University, Igarra",
    "type": "Private",
    "state": "Edo"
  },
  {
    "name": "Adekunle Ajasin University, Akungba - Akoko",
    "type": "State",
    "state": "Ondo"
  },
  {
    "name": "Adeleke University, Ede, Osun State",
    "type": "Private",
    "state": "Osun"
  },
  {
    "name": "Adeyemi Federal University of Education, Akure, Ondo State",
    "type": "Federal",
    "state": "Ondo"
  },
  {
    "name": "Admiralty University, Ibusa, Delta State",
    "type": "Federal",
    "state": "Delta"
  },
  {
    "name": "Afe Babalola University Ado-Ekiti - Ekiti State",
    "type": "Private",
    "state": "Ekiti",
    "abbreviation": "ABUAD"
  },
  {
    "name": "African Aviation and Aerospace University, Abuja, FCT",
    "type": "Federal",
    "state": "FCT Abuja"
  },
  {
    "name": "African School of Economics, FCT, Abuja",
    "type": "Private",
    "state": "FCT Abuja"
  },
  {
    "name": "African University of Science & Technology, Abuja, FCT",
    "type": "Private",
    "state": "FCT Abuja"
  },
  {
    "name": "Ahmadu Bello University, Zaria",
    "type": "Federal",
    "state": "Kaduna",
    "abbreviation": "ABU"
  },
  {
    "name": "Ahman Pategi University, Patigi, Kwara State",
    "type": "Private",
    "state": "Kwara"
  },
  {
    "name": "Air Force Institute of Technology, Kaduna",
    "type": "Federal",
    "state": "Kaduna"
  },
  {
    "name": "Ajayi Crowther University, Ibadan, Oyo State",
    "type": "Private",
    "state": "Oyo"
  },
  {
    "name": "Akwa Ibom State University, Ikot Akpaden",
    "type": "State",
    "state": "Akwa Ibom"
  },
  {
    "name": "Al-Ansar University, Maiduguri, Borno State",
    "type": "Private",
    "state": "Borno"
  },
  {
    "name": "Al-Bayan University, Ankpa, Kogi State",
    "type": "Private",
    "state": "Kogi"
  },
  {
    "name": "Al-Hikmah University, Ilorin, Kwara State",
    "type": "Private",
    "state": "Kwara"
  },
  {
    "name": "Al-Istiqama University, Sumaila, Kano State",
    "type": "Private",
    "state": "Kano"
  },
  {
    "name": "Al-Muhibbah Open University, Abuja, FCT",
    "type": "Private",
    "state": "FCT Abuja"
  },
  {
    "name": "Al-Qalam University, Katsina, Katsina State",
    "type": "Private",
    "state": "Katsina"
  },
  {
    "name": "Aletheia University, Ago-Iwoye, Ogun State",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "Alex Ekwueme Federal University, Ndufu Alike, Ebonyi State",
    "type": "Federal",
    "state": "Ebonyi"
  },
  {
    "name": "Aliko Dangote University of Science & Technology, Wudil",
    "type": "State",
    "state": "Kano"
  },
  {
    "name": "Alvan Ikoku Federal University of Education, Owerri, Imo State",
    "type": "Federal",
    "state": "Imo"
  },
  {
    "name": "Amadeus University, Amizi, Abia State",
    "type": "Private",
    "state": "Abia"
  },
  {
    "name": "Amaj University, Abuja, FCT",
    "type": "Private",
    "state": "FCT Abuja"
  },
  {
    "name": "Ambrose Alli University, Ekpoma, Edo State",
    "type": "State",
    "state": "Edo"
  },
  {
    "name": "American Open University, Abeokuta, Ogun State",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "American University of Nigeria, Yola, Adamawa State",
    "type": "Private",
    "state": "Adamawa",
    "abbreviation": "AUN"
  },
  {
    "name": "Anchor University, Ayobo, Lagos State",
    "type": "Private",
    "state": "Lagos"
  },
  {
    "name": "Arthur Jarvis University, Akpabuyo, Cross River State",
    "type": "Private",
    "state": "Cross River"
  },
  {
    "name": "Atiba University, Oyo, Oyo State",
    "type": "Private",
    "state": "Oyo"
  },
  {
    "name": "Augustine University, Ilara, Lagos State",
    "type": "Private",
    "state": "Lagos"
  },
  {
    "name": "Ave-Maria University, Piyanko, Nasarawa State",
    "type": "Private",
    "state": "Nasarawa"
  },
  {
    "name": "Azione Verde University, Amaigbo, Imo State",
    "type": "Private",
    "state": "Imo"
  },
  {
    "name": "Azman University, Kano, Kano State",
    "type": "Private",
    "state": "Kano"
  },
  {
    "name": "Baba-Ahmed University, Kano, Kano State",
    "type": "Private",
    "state": "Kano"
  },
  {
    "name": "Babcock University, Ilishan-Remo, Ogun State",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "Bamidele Olumulia University of Education Science and Technology, Ikere - Ekiti State",
    "type": "State",
    "state": "Ekiti"
  },
  {
    "name": "Bayelsa Medical University Yenagoa, Bayelsa State",
    "type": "State",
    "state": "Bayelsa"
  },
  {
    "name": "Bayero University, Kano",
    "type": "Federal",
    "state": "Kano"
  },
  {
    "name": "Baze University, FCT Abuja",
    "type": "Private",
    "state": "FCT Abuja"
  },
  {
    "name": "Bells University of Technology, Otta, Ogun State",
    "type": "Private",
    "state": "Ogun",
    "abbreviation": "BELLSTECH"
  },
  {
    "name": "Benson Idahosa University, Benin City, Edo State",
    "type": "Private",
    "state": "Edo"
  },
  {
    "name": "Benue State University of Agriculture, Science and Technology, Ihugh, Benue State",
    "type": "State",
    "state": "Benue"
  },
  {
    "name": "Bingham University, New-Karu, Nasarawa State",
    "type": "Private",
    "state": "Nasarawa"
  },
  {
    "name": "Borno State University",
    "type": "State",
    "state": "Borno"
  },
  {
    "name": "Bowen University, Iwo, Ogun State",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "Bridget University Mbaise, Okirika-Nweke, Imo State",
    "type": "Private",
    "state": "Imo"
  },
  {
    "name": "British Canadian University, Obudu, Cross River State",
    "type": "Private",
    "state": "Cross River"
  },
  {
    "name": "Caleb University, Imota, Lagos State",
    "type": "Private",
    "state": "Lagos"
  },
  {
    "name": "Canadian University of Nigeria, Abuja, FCT",
    "type": "Private",
    "state": "FCT Abuja",
    "abbreviation": "UNN"
  },
  {
    "name": "Capital City University, Kano, Kano State",
    "type": "Private",
    "state": "Kano"
  },
  {
    "name": "Caritas University, Enugu, Enugu State",
    "type": "Private",
    "state": "Enugu"
  },
  {
    "name": "Chrisland University, Owode, Ogun State",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "Christopher University, Mowe, Ogun State",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "Chukwuemeka Odumegwu Ojukwu University, Uli",
    "type": "State",
    "state": "Anambra"
  },
  {
    "name": "City University, Abuja",
    "type": "Private",
    "state": "FCT Abuja"
  },
  {
    "name": "Claretian University of Nigeria, Nekede, Imo State",
    "type": "Private",
    "state": "Imo",
    "abbreviation": "UNN"
  },
  {
    "name": "Clifford University, Owerrinta, Abia State",
    "type": "Private",
    "state": "Abia"
  },
  {
    "name": "Coal City University, Enugu, Enugu State",
    "type": "Private",
    "state": "Enugu"
  },
  {
    "name": "College of Petroleum and Energy Studies, Kaduna, Kaduna State",
    "type": "Private",
    "state": "Kaduna"
  },
  {
    "name": "Confluence University of Science and Technology Osara, Kogi State",
    "type": "State",
    "state": "Kogi"
  },
  {
    "name": "Cosmopolitan University, Abuja, FCT",
    "type": "Private",
    "state": "FCT Abuja"
  },
  {
    "name": "Covenant University, Otta, Ogun State",
    "type": "Private",
    "state": "Ogun",
    "abbreviation": "CU"
  },
  {
    "name": "Crawford University, Igbesa, Ogun State",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "Crescent University, Abeokuta, Ogun State",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "Cross River University of Education and Entrepreneurship, Akampa, Cross River State",
    "type": "State",
    "state": "Cross River"
  },
  {
    "name": "Cross River University of Technology, Calabar",
    "type": "State",
    "state": "Cross River"
  },
  {
    "name": "Delta State University, Abraka",
    "type": "State",
    "state": "Delta"
  },
  {
    "name": "Dennis Osadebey University, Asaba, Delta State",
    "type": "State",
    "state": "Delta"
  },
  {
    "name": "Dominican University, Ibadan, Oyo State",
    "type": "Private",
    "state": "Oyo"
  },
  {
    "name": "Dominion University, Ibadan, Oyo State",
    "type": "Private",
    "state": "Oyo"
  },
  {
    "name": "Ebonyi State University of Aeronautics and Aerospace Engineering, Ezza, Ebonyi State",
    "type": "State",
    "state": "Ebonyi"
  },
  {
    "name": "Ebonyi State University of ICT, Science and Technology, Oferekpe, Ebonyi State",
    "type": "State",
    "state": "Ebonyi"
  },
  {
    "name": "Ebonyi State University, Abakaliki",
    "type": "State",
    "state": "Ebonyi"
  },
  {
    "name": "Edo University, Iyamho",
    "type": "State",
    "state": "Edo"
  },
  {
    "name": "Edusoko University, Bida, Niger State",
    "type": "Private",
    "state": "Niger"
  },
  {
    "name": "Edwin Clark University, Kiagbodo, Delta State",
    "type": "Private",
    "state": "Delta"
  },
  {
    "name": "Ekiti State University, Ado-Ekiti. (formerly University of Ado-Ekiti)",
    "type": "State",
    "state": "Ekiti"
  },
  {
    "name": "Eko University of Medical Sciences, Ijanikin, Lagos",
    "type": "Private",
    "state": "Lagos"
  },
  {
    "name": "El-Amin University, Niger State",
    "type": "Private",
    "state": "Niger"
  },
  {
    "name": "Elizade University, Ilara-Mokin, Ondo State",
    "type": "Private",
    "state": "Ondo"
  },
  {
    "name": "Elrazi University of Medical Sciences, Kano, Kano State",
    "type": "Private",
    "state": "Kano"
  },
  {
    "name": "Emmanuel Alayande University of Education, Oyo, Oyo State",
    "type": "State",
    "state": "Oyo"
  },
  {
    "name": "Enugu State University of Medical and Applied Sciences, Igbo-Eno, Enugu State",
    "type": "State",
    "state": "Enugu"
  },
  {
    "name": "Enugu State University of Science & Tech, Enugu",
    "type": "State",
    "state": "Enugu"
  },
  {
    "name": "Eranova University, Mabushi, Abuja",
    "type": "Private",
    "state": "FCT Abuja"
  },
  {
    "name": "European University of Nigeria, Duboyi, Abuja, FCT",
    "type": "Private",
    "state": "FCT Abuja",
    "abbreviation": "UNN"
  },
  {
    "name": "Euston University, Abakaliki",
    "type": "Private",
    "state": "Ebonyi"
  },
  {
    "name": "Evangel University, Akaeze, Ebonyi State",
    "type": "Private",
    "state": "Ebonyi"
  },
  {
    "name": "Federal University of Agriculture and Developmental Studies, Iragbiji, Osun State",
    "type": "Federal",
    "state": "Osun"
  },
  {
    "name": "Federal University of Agriculture and Technology Obio-Akpa",
    "type": "Federal",
    "state": "Akwa Ibom"
  },
  {
    "name": "Federal University of Agriculture and Technology, Okeho, Oyo",
    "type": "Federal",
    "state": "Oyo"
  },
  {
    "name": "Federal University of Agriculture, Abeokuta",
    "type": "Federal",
    "state": "Ogun"
  },
  {
    "name": "Federal University of Agriculture, Bassam-Bari, Bayelsa",
    "type": "Federal",
    "state": "Bayelsa"
  },
  {
    "name": "Federal University of Agriculture, Mubi",
    "type": "Federal",
    "state": "Adamawa"
  },
  {
    "name": "Federal University of Agriculture, Zuru, Kebbi State",
    "type": "Federal",
    "state": "Kebbi"
  },
  {
    "name": "Federal University of Allied Health Sciences, Enugu",
    "type": "Federal",
    "state": "Enugu"
  },
  {
    "name": "Federal University of Applied Sciences, Kachia, Kaduna State",
    "type": "Federal",
    "state": "Kaduna"
  },
  {
    "name": "Federal University of Education, Kantagora, Niger State",
    "type": "Federal",
    "state": "Niger"
  },
  {
    "name": "Federal University of Education, Pankshin, Plateau State",
    "type": "Federal",
    "state": "Plateau"
  },
  {
    "name": "Federal University of Education, Zaria, Kaduna State",
    "type": "Federal",
    "state": "Kaduna"
  },
  {
    "name": "Federal University of Environment and Technology, Tai Town, Ogoniland, Rivers State",
    "type": "Federal",
    "state": "Rivers"
  },
  {
    "name": "Federal University of Health Science and Technology, Tsafe, Zamfara State",
    "type": "Federal",
    "state": "Zamfara"
  },
  {
    "name": "Federal University of Health Sciences, Azare, Bauchi State",
    "type": "Federal",
    "state": "Bauchi"
  },
  {
    "name": "Federal University of Health Sciences, Funtua, Katsina State",
    "type": "Federal",
    "state": "Katsina"
  },
  {
    "name": "Federal University of Health Sciences, Ila Orangun, Osun State",
    "type": "Federal",
    "state": "Osun"
  },
  {
    "name": "Federal University of Health Sciences, Kwale, Delta State",
    "type": "Federal",
    "state": "Delta"
  },
  {
    "name": "Federal University of Health Sciences, Otukpo, Benue State",
    "type": "Federal",
    "state": "Benue"
  },
  {
    "name": "Federal University of Medicine and Medical Sciences, Abeokuta, Ogun State",
    "type": "Federal",
    "state": "Ogun"
  },
  {
    "name": "Federal University of Petroleum Resources, Effurun",
    "type": "Federal",
    "state": "Delta"
  },
  {
    "name": "Federal University of Science and Technology, Epe",
    "type": "Federal",
    "state": "Lagos"
  },
  {
    "name": "Federal University of Science and Technology, Kabo",
    "type": "Federal",
    "state": "Kano"
  },
  {
    "name": "Federal University of Technology Ikot Abasi, Akwa Ibom State",
    "type": "Federal",
    "state": "Akwa Ibom"
  },
  {
    "name": "Federal University of Technology and Environmental Studies, Iyin-Ekiti, Ekiti State",
    "type": "Federal",
    "state": "Ekiti"
  },
  {
    "name": "Federal University of Technology, Akure",
    "type": "Federal",
    "state": "Ondo"
  },
  {
    "name": "Federal University of Technology, Babura, Jigawa State",
    "type": "Federal",
    "state": "Jigawa"
  },
  {
    "name": "Federal University of Technology, Minna",
    "type": "Federal",
    "state": "Niger"
  },
  {
    "name": "Federal University of Technology, Owerri",
    "type": "Federal",
    "state": "Imo"
  },
  {
    "name": "Federal University of Transportation, Daura, Katsina State",
    "type": "Federal",
    "state": "Katsina"
  },
  {
    "name": "Federal University, Birnin-Kebbi, Kebbi",
    "type": "Federal",
    "state": "Kebbi"
  },
  {
    "name": "Federal University, Dutse, Jigawa State",
    "type": "Federal",
    "state": "Jigawa"
  },
  {
    "name": "Federal University, Dutsin-Ma, Katsina State",
    "type": "Federal",
    "state": "Katsina"
  },
  {
    "name": "Federal University, Gashua, Yobe",
    "type": "Federal",
    "state": "Yobe"
  },
  {
    "name": "Federal University, Gusau, Zamfara",
    "type": "Federal",
    "state": "Zamfara"
  },
  {
    "name": "Federal University, Kashere, Gombe State",
    "type": "Federal",
    "state": "Gombe"
  },
  {
    "name": "Federal University, Lafia, Nasarawa State",
    "type": "Federal",
    "state": "Nasarawa"
  },
  {
    "name": "Federal University, Lokoja, Kogi State",
    "type": "Federal",
    "state": "Kogi"
  },
  {
    "name": "Federal University, Otuoke, Bayelsa",
    "type": "Federal",
    "state": "Bayelsa"
  },
  {
    "name": "Federal University, Oye-Ekiti, Ekiti State",
    "type": "Federal",
    "state": "Ekiti"
  },
  {
    "name": "Federal University, Wukari, Taraba State",
    "type": "Federal",
    "state": "Taraba"
  },
  {
    "name": "First Technical University, Ibadan",
    "type": "State",
    "state": "Oyo"
  },
  {
    "name": "Fountain University, Oshogbo, Osun State",
    "type": "Private",
    "state": "Osun"
  },
  {
    "name": "Franco British International University, Kaduna, Kaduna State",
    "type": "Private",
    "state": "Kaduna"
  },
  {
    "name": "Gerar University of Medical Sciences, Imope-Ijebu, Ogun State",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "Glorious Vision University (formerly Samuel Adegboyega University), Ogwa, Edo State",
    "type": "Private",
    "state": "Edo"
  },
  {
    "name": "Godday Erewa University, Sapele",
    "type": "Private",
    "state": "Delta"
  },
  {
    "name": "Godfrey Okoye University, Ugwuomu-Nike, Enugu State",
    "type": "Private",
    "state": "Enugu"
  },
  {
    "name": "Gombe State University, Gombe",
    "type": "State",
    "state": "Gombe"
  },
  {
    "name": "Greenfield University, Kasarami-Kaduna, Kaduna State",
    "type": "Private",
    "state": "Kaduna"
  },
  {
    "name": "Greenland University, Jalingo, Taraba State",
    "type": "Private",
    "state": "Taraba"
  },
  {
    "name": "Gregory University, Uturu, Abia State",
    "type": "Private",
    "state": "Abia"
  },
  {
    "name": "Hallmark University, Ijebu-Itele, Ogun State",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "Havilla University, Nde-Ikom, Cross River State",
    "type": "Private",
    "state": "Cross River"
  },
  {
    "name": "Hensard University, Toru-Orua, Bayelsa State",
    "type": "Private",
    "state": "Bayelsa"
  },
  {
    "name": "Hezekiah University, Umudi, Imo State",
    "type": "Private",
    "state": "Imo"
  },
  {
    "name": "High-Flyers University, Ikere-Ekiti",
    "type": "Private",
    "state": "Ekiti"
  },
  {
    "name": "Hillside University of Science and Technology, Okemesi Ekiti, Ekiti State",
    "type": "Private",
    "state": "Ekiti"
  },
  {
    "name": "Huda University, Gusau, Zamfara State",
    "type": "Private",
    "state": "Zamfara"
  },
  {
    "name": "Ibrahim Badamasi Babangida University, Lapai, Niger State",
    "type": "State",
    "state": "Niger"
  },
  {
    "name": "Iconic Open University, Sokoto, Sokoto State",
    "type": "Private",
    "state": "Sokoto"
  },
  {
    "name": "Igbinedion University, Okada, Edo State",
    "type": "Private",
    "state": "Edo"
  },
  {
    "name": "Ignatius Ajuru University of Education, Rumuolumeni",
    "type": "State",
    "state": "Rivers"
  },
  {
    "name": "Imo State University, Owerri",
    "type": "State",
    "state": "Imo"
  },
  {
    "name": "Isaac Balami University of Aeronautics and Management, Lagos State",
    "type": "Private",
    "state": "Lagos"
  },
  {
    "name": "JEFAP University, Suleja",
    "type": "Private",
    "state": "Niger"
  },
  {
    "name": "James Hope University, Lekki, Lagos State",
    "type": "Private",
    "state": "Lagos"
  },
  {
    "name": "Jewel University, Gombe, Gombe State",
    "type": "Private",
    "state": "Gombe"
  },
  {
    "name": "Jigawa State Universitiy of Allied and Medical Science",
    "type": "State",
    "state": "Jigawa"
  },
  {
    "name": "Jimoh Babalola University, Ilorin",
    "type": "Private",
    "state": "Kwara"
  },
  {
    "name": "Joseph Ayo Babalola University, Ikeji-Arakeji, Osun State",
    "type": "Private",
    "state": "Osun"
  },
  {
    "name": "Joseph Sarwuan Tarka University, Makurdi, Benue State",
    "type": "Federal",
    "state": "Benue"
  },
  {
    "name": "Kaduna State University, Kaduna",
    "type": "State",
    "state": "Kaduna"
  },
  {
    "name": "Karl-Kumm University, Vom, Plateau State",
    "type": "Private",
    "state": "Plateau"
  },
  {
    "name": "Kebbi State University of Science and Technology, Aliero",
    "type": "State",
    "state": "Kebbi"
  },
  {
    "name": "Kevin Eze University, Mgbowo, Enugu State",
    "type": "Private",
    "state": "Enugu"
  },
  {
    "name": "Khalifa Isiyaku Rabiu University, Gadon /Kaya City Gate Kano, Kano State",
    "type": "Private",
    "state": "Kano"
  },
  {
    "name": "King David Umahi University of Medical Sciences, Uburu, Ebonyi State",
    "type": "Federal",
    "state": "Ebonyi"
  },
  {
    "name": "Kings University Ode-Omu, Osun State",
    "type": "Private",
    "state": "Osun"
  },
  {
    "name": "Kingsley Ozumba (K.O) Mbadiwe University, Imo State",
    "type": "State",
    "state": "Imo"
  },
  {
    "name": "Kogi State University, Kabba, Kogi State",
    "type": "State",
    "state": "Kogi"
  },
  {
    "name": "Kola Daisi University, Ibadan, Oyo State",
    "type": "Private",
    "state": "Oyo"
  },
  {
    "name": "Kwara State University of Education, Ilorin, Kwara State",
    "type": "State",
    "state": "Kwara"
  },
  {
    "name": "Kwara State University, Ilorin",
    "type": "State",
    "state": "Kwara"
  },
  {
    "name": "Kwararafa University, Wukari, Taraba State",
    "type": "Private",
    "state": "Taraba"
  },
  {
    "name": "Ladoke Akintola University of Technology, Ogbomoso",
    "type": "State",
    "state": "Oyo"
  },
  {
    "name": "Lagos State University, Ojo, Lagos",
    "type": "State",
    "state": "Lagos",
    "abbreviation": "LASU"
  },
  {
    "name": "Lagos University of Education, LASUED, Oto/Ijanikin, Lagos State",
    "type": "State",
    "state": "Lagos"
  },
  {
    "name": "Lagos University of Science and Technology, Ikorodu, Lagos State",
    "type": "State",
    "state": "Lagos"
  },
  {
    "name": "Landmark University Omu-Aran, Kwara State",
    "type": "Private",
    "state": "Kwara"
  },
  {
    "name": "Lead City University, Ibadan, Oyo State",
    "type": "Private",
    "state": "Oyo"
  },
  {
    "name": "Leadership University, Abuja",
    "type": "Private",
    "state": "FCT Abuja"
  },
  {
    "name": "Legacy University, Okija, Anambra State",
    "type": "Private",
    "state": "Anambra"
  },
  {
    "name": "Lens University, Ilemona, Kwara State",
    "type": "Private",
    "state": "Kwara"
  },
  {
    "name": "Lighthouse University, Evbuobanosa, Edo State",
    "type": "Private",
    "state": "Edo"
  },
  {
    "name": "Lux Mundi University, Umuahia, Abia State",
    "type": "Private",
    "state": "Abia"
  },
  {
    "name": "Madonna University, Okija, Anambra State",
    "type": "Private",
    "state": "Anambra"
  },
  {
    "name": "Maduka University, Ekwegbe - Nsukka, Enugu State",
    "type": "Private",
    "state": "Enugu"
  },
  {
    "name": "Maranatha University, Lekki, Lagos State",
    "type": "Private",
    "state": "Lagos"
  },
  {
    "name": "Margaret Lawrence University, Galilee, Delta State",
    "type": "Private",
    "state": "Delta"
  },
  {
    "name": "Maria Assumpta University, Owerri",
    "type": "Private",
    "state": "Imo"
  },
  {
    "name": "Maryam Abacha American University of Nigeria, Kano, Kano State",
    "type": "Private",
    "state": "Kano",
    "abbreviation": "AUN"
  },
  {
    "name": "Mcpherson University, Seriki Sotayo, Ajebo",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "Mercy Medical University, Iwara, Iwo, Osun State",
    "type": "Private",
    "state": "Osun"
  },
  {
    "name": "Mewar University, Masaka, Nasarawa State",
    "type": "Private",
    "state": "Nasarawa"
  },
  {
    "name": "Michael & Cecilia Ibru University, Owhode, Delta State",
    "type": "Private",
    "state": "Delta"
  },
  {
    "name": "Michael Okpara University of Agriculture, Umudike",
    "type": "Federal",
    "state": "Abia"
  },
  {
    "name": "Millennium Crest University, Ikare-Akoko",
    "type": "Private",
    "state": "Ondo"
  },
  {
    "name": "Minaret University, Ikirun, Osun State",
    "type": "Private",
    "state": "Osun"
  },
  {
    "name": "Miva Open University, Abuja, FCT",
    "type": "Private",
    "state": "FCT Abuja"
  },
  {
    "name": "Modibbo Adama University, Yola",
    "type": "Federal",
    "state": "Adamawa"
  },
  {
    "name": "Monarch University, Iyesi-Ota, Ogun State",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "Moshood Abiola University of Science and Technology, Abeokuta",
    "type": "State",
    "state": "Ogun"
  },
  {
    "name": "Mountain Top University, Makogi/Oba, Ogun State",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "Mudiame University, Irrua, Edo State",
    "type": "Private",
    "state": "Edo"
  },
  {
    "name": "Muhammad Kamalud-Deen University, Ilorin, Kwara State",
    "type": "Private",
    "state": "Kwara"
  },
  {
    "name": "Nasarawa State University, Keffi",
    "type": "State",
    "state": "Nasarawa"
  },
  {
    "name": "National Open University of Nigeria, Abuja",
    "type": "Federal",
    "state": "FCT Abuja",
    "abbreviation": "UNN"
  },
  {
    "name": "National University of Science and Technology, Abuja, FCT",
    "type": "Federal",
    "state": "FCT Abuja"
  },
  {
    "name": "New City University, Ayetoro, Ogun State",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "Newgate University, Minna, Niger State",
    "type": "Private",
    "state": "Niger"
  },
  {
    "name": "Niger-Delta University, Yenagoa",
    "type": "State",
    "state": "Bayelsa"
  },
  {
    "name": "Nigeria Maritime University Okerenkoko, Delta State",
    "type": "Federal",
    "state": "Delta"
  },
  {
    "name": "Nigerian Army University, Biu",
    "type": "Federal",
    "state": "Borno"
  },
  {
    "name": "Nigerian British University, Asa, Abia State",
    "type": "Private",
    "state": "Abia"
  },
  {
    "name": "Nigerian Defence Academy, Kaduna",
    "type": "Federal",
    "state": "Kaduna"
  },
  {
    "name": "Nigerian University of Technology and Management, Apapa , Lagos State",
    "type": "Private",
    "state": "Lagos"
  },
  {
    "name": "Nile University of Nigeria, FCT Abuja",
    "type": "Private",
    "state": "FCT Abuja",
    "abbreviation": "UNN"
  },
  {
    "name": "Nnamdi Azikiwe University, Awka",
    "type": "Federal",
    "state": "Anambra"
  },
  {
    "name": "North Eastern University Gombe, Gombe State",
    "type": "Private",
    "state": "Gombe"
  },
  {
    "name": "Northwest University, Kano",
    "type": "State",
    "state": "Kano"
  },
  {
    "name": "Northwest University, Sokoto, Sokoto State",
    "type": "Private",
    "state": "Sokoto"
  },
  {
    "name": "Novena University, Ogume, Delta State",
    "type": "Private",
    "state": "Delta"
  },
  {
    "name": "Obafemi Awolowo University, Ile-Ife",
    "type": "Federal",
    "state": "Osun",
    "abbreviation": "OAU"
  },
  {
    "name": "Obong University Obong Ntak, Akwa Ibom State",
    "type": "Private",
    "state": "Akwa Ibom"
  },
  {
    "name": "Oduduwa University, Ipetumodu - Osun State",
    "type": "Private",
    "state": "Osun"
  },
  {
    "name": "Ojaja University, Eiyenkorin, Kwara State (formerly Crown-Hill University)",
    "type": "Private",
    "state": "Kwara"
  },
  {
    "name": "Olabisi Onabanjo University, Ago-Iwoye",
    "type": "State",
    "state": "Ogun"
  },
  {
    "name": "Olusegun Agagu University of Science and Technology, Okitipupa, Ondo State",
    "type": "State",
    "state": "Ondo"
  },
  {
    "name": "Omega University, Kaduna",
    "type": "Private",
    "state": "Kaduna"
  },
  {
    "name": "Ondo State University of Medical Sciences",
    "type": "State",
    "state": "Ondo"
  },
  {
    "name": "Osun State University, Osogbo",
    "type": "State",
    "state": "Osun"
  },
  {
    "name": "Owolabi University, Oke-Ila Orangun",
    "type": "Private",
    "state": "Osun"
  },
  {
    "name": "PAMO University of Medical Sciences, Port-Harcourt, Rivers State",
    "type": "Private",
    "state": "Rivers"
  },
  {
    "name": "Pan-Atlantic University, Lekki-Express Way, Lagos State",
    "type": "Private",
    "state": "Lagos",
    "abbreviation": "PAU"
  },
  {
    "name": "Paul University, Awka, Anambra State",
    "type": "Private",
    "state": "Anambra"
  },
  {
    "name": "Peaceland University, Enugu, Enugu State",
    "type": "Private",
    "state": "Enugu"
  },
  {
    "name": "Pearl University, Calabar",
    "type": "Private",
    "state": "Cross River"
  },
  {
    "name": "Peter University, Achina-Onneh, Anambra State",
    "type": "Private",
    "state": "Anambra"
  },
  {
    "name": "Philomath University, Kuje, Abuja",
    "type": "Private",
    "state": "FCT Abuja"
  },
  {
    "name": "Phoenix University, Agwada, Nasarawa State",
    "type": "Private",
    "state": "Nasarawa"
  },
  {
    "name": "Plateau State University, Bokkos",
    "type": "State",
    "state": "Plateau"
  },
  {
    "name": "Precious Cornerstone, Ibadan, Oyo State",
    "type": "Private",
    "state": "Oyo"
  },
  {
    "name": "Prime University, Abuja, FCT",
    "type": "Private",
    "state": "FCT Abuja"
  },
  {
    "name": "Prince Abubakar Audu University, Anyigba",
    "type": "State",
    "state": "Kogi"
  },
  {
    "name": "Rayhaan University, Birnin Kebbi, Kebbi State",
    "type": "Private",
    "state": "Kebbi"
  },
  {
    "name": "Redeemer's University, Mowe, Ogun State",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "Regnum Medical University, Anthony",
    "type": "Private",
    "state": "Lagos"
  },
  {
    "name": "Renaissance University, Enugu, Enugu State",
    "type": "Private",
    "state": "Enugu"
  },
  {
    "name": "Rhema University, Obeama-Asa, Rivers State",
    "type": "Private",
    "state": "Rivers"
  },
  {
    "name": "Ritman University, Ikot Ekpene, Akwa Ibom State",
    "type": "Private",
    "state": "Akwa Ibom"
  },
  {
    "name": "Rivers State University of Science & Technology, Port Harcourt, Rivers State",
    "type": "State",
    "state": "Rivers"
  },
  {
    "name": "Rv Fr. Moses Orshio Adasu University, Makurdi",
    "type": "State",
    "state": "Benue"
  },
  {
    "name": "Sa'adu Zungur University, Gadau",
    "type": "State",
    "state": "Bauchi"
  },
  {
    "name": "Saisa University Of Medical Sciences And Technology, Sokoto, Sokoto State",
    "type": "Private",
    "state": "Sokoto"
  },
  {
    "name": "Salem University, Lokoja, Kogi State",
    "type": "Private",
    "state": "Kogi"
  },
  {
    "name": "Sam Maris University, Supare, Ondo State",
    "type": "Private",
    "state": "Ondo"
  },
  {
    "name": "Sani Bello University, Kontagora",
    "type": "Private",
    "state": "Niger"
  },
  {
    "name": "Shanahan University, Onitsha, Anambra State",
    "type": "Private",
    "state": "Anambra"
  },
  {
    "name": "Shehu Shagari University of Education, Sokoto, Sokoto State",
    "type": "State",
    "state": "Sokoto"
  },
  {
    "name": "Skyline University, Nigeria, Kano, Kano State",
    "type": "Private",
    "state": "Kano"
  },
  {
    "name": "Sokoto State University, Sokoto",
    "type": "State",
    "state": "Sokoto"
  },
  {
    "name": "Southern Atlantic University, Uyo, Akwa Ibom State",
    "type": "Private",
    "state": "Akwa Ibom"
  },
  {
    "name": "Southwestern University Oku Owa, Ogun State",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "Spiritan University, Nneochi, Abia State",
    "type": "Private",
    "state": "Abia"
  },
  {
    "name": "Sports University, Idumuje, Ugboko, Delta State",
    "type": "Private",
    "state": "Delta"
  },
  {
    "name": "Sule Lamido University, Kafin Hausa",
    "type": "State",
    "state": "Jigawa"
  },
  {
    "name": "Summit University, Offa, Kwara State",
    "type": "Private",
    "state": "Kwara"
  },
  {
    "name": "Tai Solarin Federal University of Education, Ijagun, Ijebu Ode",
    "type": "Federal",
    "state": "Ogun"
  },
  {
    "name": "Tansian University, Umunya, Anambra State",
    "type": "Private",
    "state": "Anambra"
  },
  {
    "name": "Taraba State University of Tropical Agriculture, Science, Technology and Climate Action, Gembu",
    "type": "State",
    "state": "Taraba"
  },
  {
    "name": "Taraba State University, Jalingo",
    "type": "State",
    "state": "Taraba"
  },
  {
    "name": "Tazkiyah University, Kaduna",
    "type": "Private",
    "state": "Kaduna"
  },
  {
    "name": "The Duke Medical University Calabar, Cross River State",
    "type": "Private",
    "state": "Cross River"
  },
  {
    "name": "The Nigeria Police Academy, Wudil, Kano State",
    "type": "Federal",
    "state": "Kano"
  },
  {
    "name": "Thomas Adewumi University, Oko-Irese, Kwara State",
    "type": "Private",
    "state": "Kwara"
  },
  {
    "name": "Tonnie Iredia University of Communication, Benin City, Edo State",
    "type": "Private",
    "state": "Edo"
  },
  {
    "name": "Topfaith University, Mkpatak, Akwa-Ibom State",
    "type": "Private",
    "state": "Akwa Ibom"
  },
  {
    "name": "Transatlantic University of Medicine and Health Sciences, Umuchukwu",
    "type": "Private",
    "state": "Anambara"
  },
  {
    "name": "Trinity University, Laloko, Ogun State",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "Umaru Musa Yar’Adua University, Katsina",
    "type": "State",
    "state": "Katsina"
  },
  {
    "name": "Ummah University of Nigeria, Abuja",
    "type": "Private",
    "state": "FCT Abuja",
    "abbreviation": "UNN"
  },
  {
    "name": "Unique Open University, Ojo, Lagos State",
    "type": "Private",
    "state": "Lagos"
  },
  {
    "name": "University of Abuja, Abuja",
    "type": "Federal",
    "state": "FCT Abuja"
  },
  {
    "name": "University of Africa, Toru-Orua",
    "type": "State",
    "state": "Bayelsa"
  },
  {
    "name": "University of Agriculture and Environmental Sciences, Umuagwo, Imo State",
    "type": "State",
    "state": "Imo"
  },
  {
    "name": "University of Benin, Benin City",
    "type": "Federal",
    "state": "Edo",
    "abbreviation": "UNIBEN"
  },
  {
    "name": "University of Calabar, Calabar",
    "type": "Federal",
    "state": "Cross River"
  },
  {
    "name": "University of Delta, Agbor, Delta State",
    "type": "State",
    "state": "Delta"
  },
  {
    "name": "University of Fortune, Igbotako, Ondo State",
    "type": "Private",
    "state": "Ondo"
  },
  {
    "name": "University of Ibadan, Ibadan",
    "type": "Federal",
    "state": "Oyo",
    "abbreviation": "UI"
  },
  {
    "name": "University of Ilesa, Osun State",
    "type": "State",
    "state": "Osun"
  },
  {
    "name": "University of Ilorin, Ilorin",
    "type": "Federal",
    "state": "Kwara",
    "abbreviation": "UNILORIN"
  },
  {
    "name": "University of Innovation, Science & Technology, Omuma",
    "type": "State",
    "state": "Imo"
  },
  {
    "name": "University of Jos, Jos",
    "type": "Federal",
    "state": "Plateau"
  },
  {
    "name": "University of Lagos, Lagos",
    "type": "Federal",
    "state": "Lagos",
    "abbreviation": "UNILAG"
  },
  {
    "name": "University of Maiduguri, Maiduguri",
    "type": "Federal",
    "state": "Borno"
  },
  {
    "name": "University of Maritime Studies, Oron, Akwa Ibom State",
    "type": "Federal",
    "state": "Akwa Ibom"
  },
  {
    "name": "University of Mkar, Mkar, Benue State",
    "type": "Private",
    "state": "Benue"
  },
  {
    "name": "University of Nigeria, Nsukka",
    "type": "Federal",
    "state": "Enugu",
    "abbreviation": "UNN"
  },
  {
    "name": "University of Offa, Offa, Kwara State",
    "type": "Private",
    "state": "Kwara"
  },
  {
    "name": "University of Port-Harcourt, Port-Harcourt",
    "type": "Federal",
    "state": "Rivers"
  },
  {
    "name": "University of Science and Technology, Ozoro, Delta State",
    "type": "State",
    "state": "Delta"
  },
  {
    "name": "University of Uyo, Uyo",
    "type": "Federal",
    "state": "Akwa Ibom"
  },
  {
    "name": "University on the Niger, Umunya, Anambra State",
    "type": "Private",
    "state": "Anambra"
  },
  {
    "name": "Usmanu Danfodiyo University, Sokoto",
    "type": "Federal",
    "state": "Sokoto"
  },
  {
    "name": "Venite University Iloro -Ekiti, Ekiti State",
    "type": "Private",
    "state": "Ekiti"
  },
  {
    "name": "Veritas University, Abuja, FCT",
    "type": "Private",
    "state": "FCT Abuja"
  },
  {
    "name": "Vision University, Ikogbo, Ogun State",
    "type": "Private",
    "state": "Ogun"
  },
  {
    "name": "Wellspring University, Evbuobanosa, Edo State",
    "type": "Private",
    "state": "Edo"
  },
  {
    "name": "Wesley University of Science & Technology, Ondo State",
    "type": "Private",
    "state": "Ondo"
  },
  {
    "name": "West Midland Open University, Ibadan, Oyo State",
    "type": "Private",
    "state": "Oyo"
  },
  {
    "name": "Western Delta University, Oghara, Delta State",
    "type": "Private",
    "state": "Delta"
  },
  {
    "name": "Westland University, Iwo, Osun State",
    "type": "Private",
    "state": "Osun"
  },
  {
    "name": "Wigwe University, Isiokpo, Rivers State",
    "type": "Private",
    "state": "Rivers"
  },
  {
    "name": "Yobe State University Damaturu, Yobe State",
    "type": "State",
    "state": "Yobe"
  },
  {
    "name": "Yusuf Maitama Sule Federal University of Education, Kano, Kano State",
    "type": "Federal",
    "state": "Kano"
  },
  {
    "name": "Zamfara State University, Talata-Mafara",
    "type": "State",
    "state": "Zamfara"
  }
];
