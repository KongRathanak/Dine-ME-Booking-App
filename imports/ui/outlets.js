export const OUTLETS = [
  {
    id: "central",
    name: "SteamMe! Aeon Mall",
    tagline: "Fine dining · Table reservations",
    address: "Ground Floor, 8B Entrance, Aeon Mall Phnom Penh Riverside, Street Samdach Sothearos Blvd (3), 12301",
    mapUrl: "https://www.google.com/maps/place/STEAM+ME/@11.5476054,104.934717,1075m/data=!3m2!1e3!4b1!4m6!3m5!1s0x310951325355ae3f:0xbf67b1e7ec6ae200!8m2!3d11.5476054!4d104.934717!16s%2Fg%2F11xth38mzz?entry=ttu&g_ep=EgoyMDI2MDYxMy4wIKXMDSoASAFQAw%3D%3D",
  },
  {
    id: "central eden",
    name: "SteamMe! Eden",
    tagline: "Fine dining · Table reservations",
    address: "Ground Floor, 8B Entrance, Aeon Mall Phnom Penh Riverside, Street Samdach Sothearos Blvd (3), 12301",
    mapUrl: "https://www.google.com/maps/place/STEAM+ME/@11.5476054,104.934717,1075m/data=!3m2!1e3!4b1!4m6!3m5!1s0x310951325355ae3f:0xbf67b1e7ec6ae200!8m2!3d11.5476054!4d104.934717!16s%2Fg%2F11xth38mzz?entry=ttu&g_ep=EgoyMDI2MDYxMy4wIKXMDSoASAFQAw%3D%3D",
  }
];

export const getOutlet = (id) => OUTLETS.find((o) => o.id === id) ?? OUTLETS[0];
