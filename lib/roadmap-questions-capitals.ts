import type { Seed } from './roadmap-build';

// Countries & Capitals — 10 levels × 8 questions, easiest → hardest.
export const capitalsSeeds: Seed[] = [
  // ── Level 1 — European Capitals ──
  { q: 'What is the capital of France?', opts: ['Paris', 'Lyon', 'Marseille', 'Nice'], a: 0, e: 'Paris has been the capital of France since the Middle Ages and is its largest city.', tags: ['capitals', 'europe'] },
  { q: 'What is the capital of the United Kingdom?', opts: ['Birmingham', 'Manchester', 'London', 'Liverpool'], a: 2, e: 'London, on the River Thames, is the capital and largest city of the United Kingdom.', tags: ['capitals', 'europe'] },
  { q: 'What is the capital of Italy?', opts: ['Milan', 'Rome', 'Naples', 'Turin'], a: 1, e: 'Rome, once the heart of the Roman Empire, has been Italy\'s capital since 1871.', tags: ['capitals', 'europe'] },
  { q: 'What is the capital of Spain?', opts: ['Barcelona', 'Valencia', 'Seville', 'Madrid'], a: 3, e: 'Madrid, in the centre of the country, is the capital and largest city of Spain.', tags: ['capitals', 'europe'] },
  { q: 'What is the capital of Germany?', opts: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt'], a: 0, e: 'Berlin became the capital of a reunified Germany in 1990 and is its largest city.', tags: ['capitals', 'europe'] },
  { q: 'What is the capital of Portugal?', opts: ['Porto', 'Braga', 'Coimbra', 'Lisbon'], a: 3, e: 'Lisbon, on the Atlantic coast, is the capital and largest city of Portugal.', tags: ['capitals', 'europe'] },
  { q: 'What is the capital of Greece?', opts: ['Thessaloniki', 'Patras', 'Athens', 'Heraklion'], a: 2, e: 'Athens is one of the world\'s oldest cities and the capital of Greece.', tags: ['capitals', 'europe'] },
  { q: 'What is the capital of the Netherlands?', opts: ['Rotterdam', 'Amsterdam', 'The Hague', 'Utrecht'], a: 1, e: 'Amsterdam is the constitutional capital of the Netherlands, though the government sits in The Hague.', tags: ['capitals', 'europe'] },

  // ── Level 2 — Asian Capitals ──
  { q: 'What is the capital of Japan?', opts: ['Osaka', 'Tokyo', 'Kyoto', 'Yokohama'], a: 1, e: 'Tokyo has been Japan\'s capital since 1868, when the emperor moved there from Kyoto.', tags: ['capitals', 'asia'] },
  { q: 'What is the capital of China?', opts: ['Shanghai', 'Guangzhou', 'Shenzhen', 'Beijing'], a: 3, e: 'Beijing is the capital of China, while Shanghai is its largest city by population.', tags: ['capitals', 'asia'] },
  { q: 'What is the capital of India?', opts: ['New Delhi', 'Mumbai', 'Kolkata', 'Bangalore'], a: 0, e: 'New Delhi, within the larger city of Delhi, is India\'s capital and seat of government.', tags: ['capitals', 'asia'] },
  { q: 'What is the capital of South Korea?', opts: ['Busan', 'Incheon', 'Seoul', 'Daegu'], a: 2, e: 'Seoul, on the Han River, is the capital and by far the largest city of South Korea.', tags: ['capitals', 'asia'] },
  { q: 'What is the capital of Thailand?', opts: ['Chiang Mai', 'Phuket', 'Pattaya', 'Bangkok'], a: 3, e: 'Bangkok is the capital and largest city of Thailand.', tags: ['capitals', 'asia'] },
  { q: 'What is the capital of Vietnam?', opts: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hue'], a: 1, e: 'Hanoi is the capital of Vietnam, while Ho Chi Minh City (formerly Saigon) is the largest.', tags: ['capitals', 'asia'] },
  { q: 'What is the capital of Indonesia?', opts: ['Surabaya', 'Bandung', 'Jakarta', 'Medan'], a: 2, e: 'Jakarta, on the island of Java, is the capital and largest city of Indonesia.', tags: ['capitals', 'asia'] },
  { q: 'What is the capital of the Philippines?', opts: ['Manila', 'Cebu', 'Davao', 'Quezon City'], a: 0, e: 'Manila is the capital of the Philippines; nearby Quezon City held the role from 1948 to 1976.', tags: ['capitals', 'asia'] },

  // ── Level 3 — African Capitals ──
  { q: 'What is the capital of Egypt?', opts: ['Alexandria', 'Giza', 'Cairo', 'Luxor'], a: 2, e: 'Cairo, on the Nile, is the capital and largest city of Egypt.', tags: ['capitals', 'africa'] },
  { q: 'What is the capital of Kenya?', opts: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'], a: 0, e: 'Nairobi is the capital and largest city of Kenya.', tags: ['capitals', 'africa'] },
  { q: 'What is the capital of Morocco?', opts: ['Casablanca', 'Marrakesh', 'Fez', 'Rabat'], a: 3, e: 'Rabat is the capital of Morocco, while Casablanca is its largest city.', tags: ['capitals', 'africa'] },
  { q: 'What is the capital of Nigeria?', opts: ['Lagos', 'Abuja', 'Kano', 'Ibadan'], a: 1, e: 'Abuja became Nigeria\'s capital in 1991, replacing the much larger city of Lagos.', tags: ['capitals', 'africa'] },
  { q: 'What is the administrative capital of South Africa?', opts: ['Pretoria', 'Cape Town', 'Johannesburg', 'Durban'], a: 0, e: 'Pretoria is the administrative capital of South Africa, which uniquely has three capital cities.', tags: ['capitals', 'africa'] },
  { q: 'What is the capital of Ethiopia?', opts: ['Dire Dawa', 'Mekelle', 'Addis Ababa', 'Gondar'], a: 2, e: 'Addis Ababa is the capital of Ethiopia and hosts the headquarters of the African Union.', tags: ['capitals', 'africa'] },
  { q: 'What is the capital of Ghana?', opts: ['Kumasi', 'Accra', 'Tamale', 'Takoradi'], a: 1, e: 'Accra, on the Gulf of Guinea, is the capital and largest city of Ghana.', tags: ['capitals', 'africa'] },
  { q: 'What is the capital of Tanzania?', opts: ['Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma'], a: 3, e: 'Dodoma is the official capital of Tanzania, though Dar es Salaam remains the largest city.', tags: ['capitals', 'africa'] },

  // ── Level 4 — Americas Capitals ──
  { q: 'What is the capital of the United States?', opts: ['New York City', 'Los Angeles', 'Chicago', 'Washington, D.C.'], a: 3, e: 'Washington, D.C. is the capital of the United States, a district that is not part of any state.', tags: ['capitals', 'americas'] },
  { q: 'What is the capital of Canada?', opts: ['Toronto', 'Ottawa', 'Montreal', 'Vancouver'], a: 1, e: 'Ottawa, in Ontario, is the capital of Canada, chosen by Queen Victoria in 1857.', tags: ['capitals', 'americas'] },
  { q: 'What is the capital of Mexico?', opts: ['Guadalajara', 'Monterrey', 'Mexico City', 'Puebla'], a: 2, e: 'Mexico City, built on the site of Aztec Tenochtitlan, is the capital and largest city of Mexico.', tags: ['capitals', 'americas'] },
  { q: 'What is the capital of Brazil?', opts: ['Brasília', 'Rio de Janeiro', 'São Paulo', 'Salvador'], a: 0, e: 'Brasília was purpose-built and became Brazil\'s capital in 1960, replacing Rio de Janeiro.', tags: ['capitals', 'americas'] },
  { q: 'What is the capital of Argentina?', opts: ['Córdoba', 'Buenos Aires', 'Rosario', 'Mendoza'], a: 1, e: 'Buenos Aires, on the Río de la Plata, is the capital and largest city of Argentina.', tags: ['capitals', 'americas'] },
  { q: 'What is the capital of Peru?', opts: ['Cusco', 'Arequipa', 'Trujillo', 'Lima'], a: 3, e: 'Lima, founded by the Spanish in 1535, is the capital and largest city of Peru.', tags: ['capitals', 'americas'] },
  { q: 'What is the capital of Colombia?', opts: ['Bogotá', 'Medellín', 'Cali', 'Cartagena'], a: 0, e: 'Bogotá, high in the Andes, is the capital and largest city of Colombia.', tags: ['capitals', 'americas'] },
  { q: 'What is the capital of Chile?', opts: ['Valparaíso', 'Concepción', 'Santiago', 'Antofagasta'], a: 2, e: 'Santiago is the capital of Chile, while the National Congress sits in nearby Valparaíso.', tags: ['capitals', 'americas'] },

  // ── Level 5 — Oceania & Island Capitals ──
  { q: 'What is the capital of Australia?', opts: ['Canberra', 'Sydney', 'Melbourne', 'Brisbane'], a: 0, e: 'Canberra was purpose-built as a compromise between rivals Sydney and Melbourne.', tags: ['capitals', 'oceania'] },
  { q: 'What is the capital of New Zealand?', opts: ['Auckland', 'Wellington', 'Christchurch', 'Hamilton'], a: 1, e: 'Wellington is the capital of New Zealand, while Auckland is its largest city.', tags: ['capitals', 'oceania'] },
  { q: 'What is the capital of Fiji?', opts: ['Nadi', 'Lautoka', 'Labasa', 'Suva'], a: 3, e: 'Suva, on the island of Viti Levu, is the capital and largest city of Fiji.', tags: ['capitals', 'oceania'] },
  { q: 'What is the capital of Cuba?', opts: ['Santiago de Cuba', 'Camagüey', 'Havana', 'Holguín'], a: 2, e: 'Havana is the capital and largest city of Cuba, founded by the Spanish in 1519.', tags: ['capitals', 'islands'] },
  { q: 'What is the capital of Jamaica?', opts: ['Montego Bay', 'Spanish Town', 'Kingston', 'Portmore'], a: 2, e: 'Kingston is the capital and largest city of Jamaica; Spanish Town was the colonial capital.', tags: ['capitals', 'islands'] },
  { q: 'What is the capital of Iceland?', opts: ['Reykjavík', 'Akureyri', 'Kópavogur', 'Hafnarfjörður'], a: 0, e: 'Reykjavík is the world\'s northernmost capital of a sovereign state.', tags: ['capitals', 'islands'] },
  { q: 'What is the capital of Papua New Guinea?', opts: ['Lae', 'Mount Hagen', 'Madang', 'Port Moresby'], a: 3, e: 'Port Moresby, on the Gulf of Papua, is the capital and largest city of Papua New Guinea.', tags: ['capitals', 'oceania'] },
  { q: 'What is the capital of the Maldives?', opts: ['Hulhumalé', 'Malé', 'Addu City', 'Fuvahmulah'], a: 1, e: 'Malé is one of the world\'s most densely populated capitals, packed onto a small island.', tags: ['capitals', 'islands'] },

  // ── Level 6 — Capitals of Large Countries ──
  { q: 'What is the capital of Russia, the world\'s largest country by area?', opts: ['Saint Petersburg', 'Moscow', 'Novosibirsk', 'Yekaterinburg'], a: 1, e: 'Moscow is the capital of Russia; Saint Petersburg served as capital from 1712 to 1918.', tags: ['capitals', 'large-countries'] },
  { q: 'What is the capital of Kazakhstan, the largest landlocked country?', opts: ['Almaty', 'Shymkent', 'Astana', 'Karaganda'], a: 2, e: 'Astana became the capital in 1997 and was briefly named Nur-Sultan before reverting in 2022.', tags: ['capitals', 'large-countries'] },
  { q: 'What is the capital of Algeria, Africa\'s largest country by area?', opts: ['Algiers', 'Oran', 'Constantine', 'Annaba'], a: 0, e: 'Algiers, on the Mediterranean coast, is the capital and largest city of Algeria.', tags: ['capitals', 'large-countries'] },
  { q: 'What is the capital of the Democratic Republic of the Congo?', opts: ['Lubumbashi', 'Mbuji-Mayi', 'Kisangani', 'Kinshasa'], a: 3, e: 'Kinshasa sits across the Congo River from Brazzaville, the closest pair of capitals in the world.', tags: ['capitals', 'large-countries'] },
  { q: 'What is the capital of Saudi Arabia?', opts: ['Jeddah', 'Mecca', 'Medina', 'Riyadh'], a: 3, e: 'Riyadh, in the centre of the Arabian Peninsula, is the capital and largest city of Saudi Arabia.', tags: ['capitals', 'large-countries'] },
  { q: 'What is the capital of Sudan?', opts: ['Omdurman', 'Khartoum', 'Port Sudan', 'Nyala'], a: 1, e: 'Khartoum sits where the Blue Nile and White Nile meet to form the main Nile.', tags: ['capitals', 'large-countries'] },
  { q: 'What is the capital of Iran?', opts: ['Mashhad', 'Isfahan', 'Tehran', 'Shiraz'], a: 2, e: 'Tehran, at the foot of the Alborz Mountains, is the capital and largest city of Iran.', tags: ['capitals', 'large-countries'] },
  { q: 'What is the capital of Pakistan?', opts: ['Islamabad', 'Karachi', 'Lahore', 'Faisalabad'], a: 0, e: 'Islamabad was purpose-built in the 1960s to replace Karachi as Pakistan\'s capital.', tags: ['capitals', 'large-countries'] },

  // ── Level 7 — Tricky Capitals ──
  { q: 'What is the capital of Turkey?', opts: ['Istanbul', 'Izmir', 'Ankara', 'Antalya'], a: 2, e: 'Ankara became the capital in 1923, replacing Istanbul, which remains the largest city.', tags: ['capitals', 'tricky'] },
  { q: 'What is the capital of Switzerland?', opts: ['Zurich', 'Geneva', 'Basel', 'Bern'], a: 3, e: 'Bern is the seat of government of Switzerland, while Zurich is the largest city.', tags: ['capitals', 'tricky'] },
  { q: 'What is the capital of Myanmar?', opts: ['Yangon', 'Naypyidaw', 'Mandalay', 'Bagan'], a: 1, e: 'Naypyidaw was built inland and became the capital in 2006, replacing Yangon (Rangoon).', tags: ['capitals', 'tricky'] },
  { q: 'What is the official capital of Côte d\'Ivoire (Ivory Coast)?', opts: ['Yamoussoukro', 'Abidjan', 'Bouaké', 'San-Pédro'], a: 0, e: 'Yamoussoukro became the official capital in 1983, though Abidjan remains the economic hub.', tags: ['capitals', 'tricky'] },
  { q: 'What is the constitutional capital of Bolivia?', opts: ['Sucre', 'La Paz', 'Santa Cruz', 'Cochabamba'], a: 0, e: 'Sucre is Bolivia\'s constitutional capital, while La Paz is the seat of government.', tags: ['capitals', 'tricky'] },
  { q: 'What is the official capital of Benin?', opts: ['Cotonou', 'Parakou', 'Porto-Novo', 'Abomey'], a: 2, e: 'Porto-Novo is the official capital of Benin, though Cotonou is the seat of government and largest city.', tags: ['capitals', 'tricky'] },
  { q: 'What is the capital of Belize?', opts: ['Belize City', 'San Ignacio', 'Orange Walk', 'Belmopan'], a: 3, e: 'Belmopan was built inland after a hurricane and became the capital in 1970, replacing Belize City.', tags: ['capitals', 'tricky'] },
  { q: 'What is the official capital of Sri Lanka?', opts: ['Colombo', 'Sri Jayawardenepura Kotte', 'Kandy', 'Galle'], a: 1, e: 'Sri Jayawardenepura Kotte is the administrative capital, while Colombo is the commercial hub and largest city.', tags: ['capitals', 'tricky'] },

  // ── Level 8 — Multiple & Former Capitals ──
  { q: 'Which city is the legislative capital of South Africa?', opts: ['Pretoria', 'Bloemfontein', 'Johannesburg', 'Cape Town'], a: 3, e: 'Cape Town is the legislative capital, hosting South Africa\'s Parliament.', tags: ['capitals', 'multiple-capitals'] },
  { q: 'Which city was Brazil\'s capital before Brasília?', opts: ['Rio de Janeiro', 'São Paulo', 'Salvador', 'Recife'], a: 0, e: 'Rio de Janeiro was Brazil\'s capital from 1763 until Brasília took over in 1960.', tags: ['capitals', 'former-capitals'] },
  { q: 'Which city was Nigeria\'s capital before Abuja?', opts: ['Kano', 'Lagos', 'Ibadan', 'Port Harcourt'], a: 1, e: 'Lagos was Nigeria\'s capital until the government moved to purpose-built Abuja in 1991.', tags: ['capitals', 'former-capitals'] },
  { q: 'Which city was Myanmar\'s capital before Naypyidaw?', opts: ['Mandalay', 'Bagan', 'Yangon', 'Taunggyi'], a: 2, e: 'Yangon (Rangoon) was the capital until the government moved to Naypyidaw in 2006.', tags: ['capitals', 'former-capitals'] },
  { q: 'Which city was Kazakhstan\'s capital before Astana?', opts: ['Shymkent', 'Karaganda', 'Almaty', 'Pavlodar'], a: 2, e: 'Almaty was the capital until 1997, when the seat of government moved north to Astana.', tags: ['capitals', 'former-capitals'] },
  { q: 'Which city is the judicial capital of South Africa?', opts: ['Cape Town', 'Durban', 'Pretoria', 'Bloemfontein'], a: 3, e: 'Bloemfontein is the judicial capital, home to the Supreme Court of Appeal.', tags: ['capitals', 'multiple-capitals'] },
  { q: 'What is the administrative capital of Eswatini (Swaziland)?', opts: ['Mbabane', 'Manzini', 'Lobamba', 'Big Bend'], a: 0, e: 'Mbabane is the administrative capital, while Lobamba is the royal and legislative capital.', tags: ['capitals', 'multiple-capitals'] },
  { q: 'What is the administrative capital of Malaysia, home to the federal government?', opts: ['Kuala Lumpur', 'Putrajaya', 'George Town', 'Johor Bahru'], a: 1, e: 'Putrajaya is Malaysia\'s administrative capital, while Kuala Lumpur remains the official national capital.', tags: ['capitals', 'multiple-capitals'] },

  // ── Level 9 — Capital Cities Deep Dive ──
  { q: 'What is the capital of Mongolia?', opts: ['Ulaanbaatar', 'Erdenet', 'Darkhan', 'Choibalsan'], a: 0, e: 'Ulaanbaatar, meaning "Red Hero," is the coldest capital city in the world by average temperature.', tags: ['capitals', 'deep-dive'] },
  { q: 'What is the capital of Bhutan?', opts: ['Paro', 'Punakha', 'Phuentsholing', 'Thimphu'], a: 3, e: 'Thimphu is the capital of Bhutan and one of the few capitals without traffic lights.', tags: ['capitals', 'deep-dive'] },
  { q: 'What is the capital of Turkmenistan?', opts: ['Türkmenbaşy', 'Mary', 'Ashgabat', 'Daşoguz'], a: 2, e: 'Ashgabat is famous for its many white marble buildings and is the capital of Turkmenistan.', tags: ['capitals', 'deep-dive'] },
  { q: 'What is the capital of Kyrgyzstan?', opts: ['Osh', 'Bishkek', 'Jalal-Abad', 'Karakol'], a: 1, e: 'Bishkek, at the foot of the Tian Shan mountains, is the capital and largest city of Kyrgyzstan.', tags: ['capitals', 'deep-dive'] },
  { q: 'What is the capital of Armenia?', opts: ['Gyumri', 'Yerevan', 'Vanadzor', 'Vagharshapat'], a: 1, e: 'Yerevan is one of the world\'s oldest continuously inhabited cities and the capital of Armenia.', tags: ['capitals', 'deep-dive'] },
  { q: 'What is the capital of Georgia?', opts: ['Tbilisi', 'Batumi', 'Kutaisi', 'Rustavi'], a: 0, e: 'Tbilisi, on the Kura River, is the capital and largest city of Georgia.', tags: ['capitals', 'deep-dive'] },
  { q: 'What is the capital of Azerbaijan?', opts: ['Ganja', 'Sumqayit', 'Lankaran', 'Baku'], a: 3, e: 'Baku, on the Caspian Sea, is the largest and lowest-lying capital city in the world.', tags: ['capitals', 'deep-dive'] },
  { q: 'What is the capital of Uzbekistan?', opts: ['Samarkand', 'Bukhara', 'Tashkent', 'Nukus'], a: 2, e: 'Tashkent is the capital and largest city of Uzbekistan and the most populous city in Central Asia.', tags: ['capitals', 'deep-dive'] },

  // ── Level 10 — Capitals Mastery ──
  { q: 'What is the capital of Palau?', opts: ['Koror', 'Ngerulmud', 'Melekeok', 'Airai'], a: 1, e: 'Ngerulmud replaced Koror as Palau\'s capital in 2006 and is one of the least populous capitals on Earth.', tags: ['capitals', 'mastery'] },
  { q: 'What is the capital of Nauru?', opts: ['Yaren', 'Denigomodu', 'Aiwo', 'Meneng'], a: 0, e: 'Nauru has no official capital, but Yaren serves as its de facto seat of government.', tags: ['capitals', 'mastery'] },
  { q: 'What is the capital of Brunei?', opts: ['Kuala Belait', 'Seria', 'Tutong', 'Bandar Seri Begawan'], a: 3, e: 'Bandar Seri Begawan is the capital and largest city of the sultanate of Brunei.', tags: ['capitals', 'mastery'] },
  { q: 'What is the capital of Liechtenstein?', opts: ['Schaan', 'Balzers', 'Vaduz', 'Triesen'], a: 2, e: 'Vaduz is the capital of Liechtenstein, though the nearby village of Schaan is more populous.', tags: ['capitals', 'mastery'] },
  { q: 'What is the capital of Suriname?', opts: ['Lelydorp', 'Nieuw Nickerie', 'Paramaribo', 'Moengo'], a: 2, e: 'Paramaribo, with its Dutch colonial architecture, is the capital and largest city of Suriname.', tags: ['capitals', 'mastery'] },
  { q: 'What is the capital of Djibouti?', opts: ['Ali Sabieh', 'Djibouti', 'Tadjoura', 'Obock'], a: 1, e: 'Djibouti City, at the mouth of the Red Sea, shares its name with the country it governs.', tags: ['capitals', 'mastery'] },
  { q: 'What is the capital of the Comoros?', opts: ['Moroni', 'Mutsamudu', 'Fomboni', 'Domoni'], a: 0, e: 'Moroni, on the island of Grande Comore, is the capital and largest city of the Comoros.', tags: ['capitals', 'mastery'] },
  { q: 'What is the capital of Timor-Leste (East Timor)?', opts: ['Baucau', 'Maliana', 'Suai', 'Dili'], a: 3, e: 'Dili, on the north coast, is the capital and largest city of Timor-Leste.', tags: ['capitals', 'mastery'] },
];
