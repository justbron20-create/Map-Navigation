/* Famous tourist spots in Tabaco City.
   Add or edit spots here. Format:
   { name, lat, lng, type: "m" (by road) or "i" (San Miguel Island, by boat), desc, approx }
   approx: true  → the pin is a rough position. Check it on openstreetmap.org
   (right-click the exact place → "Show address") and paste the real coordinates. */
const SPOTS = [
  { name: "Mayon Skyline (Mayon Rest House & Planetarium)", lat: 13.284596, lng: 123.6712432, type: "m",
    desc: "Viewpoint on the slope of Mayon Volcano in Brgy. Buang, with a planetarium and science park.", approx: true },

  { name: "St. John the Baptist Parish Church", lat: 13.35962, lng: 123.72915, type: "m",
    desc: "Heritage church in the city center, a National Cultural Treasure.", approx: true },

  { name: "Angela Manalang Gloria Ancestral House", lat: 13.35987, lng: 123.73172, type: "m",
    desc: "Ancestral house of the Filipino poet, in the city proper.", approx: true },

  { name: "Tabaco Port", lat: 13.36240, lng: 123.73731, type: "m",
    desc: "Seaport on the waterfront. Boats to Catanduanes and San Miguel Island leave from here.", approx: true },

  { name: "San Miguel Island", lat: 13.4001, lng: 123.7671, type: "i",
    desc: "Island with scenic views and fishing villages (Brgy. Rawis). Reached by boat from Tabaco Port.", approx: true }
];
