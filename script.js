let map;

// Initialize map
document.addEventListener("DOMContentLoaded", () => {
  map = L.map("map").setView([20.5937, 78.9629], 5); // Default: India view

  // Load OSM tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  // Get user location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const userLatLng = [pos.coords.latitude, pos.coords.longitude];
      map.setView(userLatLng, 15);

      // User marker
      L.marker(userLatLng).addTo(map).bindPopup("You are here").openPopup();

      // Search for cafes nearby using Overpass API
      findCafes(userLatLng);
    });
  } else {
    alert("Geolocation not supported.");
  }
});

// Function: Find cafes
function findCafes(userLatLng) {
  const [lat, lon] = userLatLng;
  const overpassUrl = `
    https://overpass-api.de/api/interpreter?data=[out:json];
    node(around:1500,${lat},${lon})["amenity"="cafe"];
    out;
  `;

  fetch(overpassUrl)
    .then(res => res.json())
    .then(data => {
      const resultsDiv = document.getElementById("results");
      resultsDiv.innerHTML = "";

      data.elements.forEach(cafe => {
        const cafeLatLng = [cafe.lat, cafe.lon];
        const name = cafe.tags.name || "Unnamed Cafe";

        // Add marker
        const marker = L.marker(cafeLatLng).addTo(map);
        marker.bindPopup(`<strong>${name}</strong>`);

        // Add to list
        const div = document.createElement("div");
        div.className = "list-group-item d-flex justify-content-between align-items-center";
        div.innerHTML = `
          <div>
            <strong>${name}</strong>
          </div>
          <button class="btn btn-sm btn-primary">Route</button>
        `;

        // Route button
        div.querySelector("button").addEventListener("click", () => {
          getRoute(userLatLng, cafeLatLng);
        });

        resultsDiv.appendChild(div);
      });
    });
}

// Function: Get route using OSRM
function getRoute(start, end) {
  const url = `https://router.project-osrm.org/route/v1/foot/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const coords = data.routes[0].geometry.coordinates;
      const latlngs = coords.map(coord => [coord[1], coord[0]]);

      // Draw route
      L.polyline(latlngs, { color: "blue" }).addTo(map);
      map.fitBounds(L.polyline(latlngs).getBounds());
    });
}
// Search bar logic
// --- SEARCH LOGIC ---
document.getElementById("searchBtn").addEventListener("click", () => {
  const query = document.getElementById("searchBox").value.trim();
  if (!query) {
    alert("Please enter a location!");
    return;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;

  fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "CafeFinderApp/1.0 (test@example.com)" // required by Nominatim
    }
  })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      console.log("Search results:", data); // Debugging log
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const location = [lat, lon];

        // Move the map
        map.setView(location, 15);

        // Remove old search marker if exists
        if (window.searchMarker) {
          map.removeLayer(window.searchMarker);
        }

        // Add new marker
        window.searchMarker = L.marker(location)
          .addTo(map)
          .bindPopup(data[0].display_name)
          .openPopup();

        // Refresh cafes near this new location
        findCafes(location);
      } else {
        alert("Location not found!");
      }
    })
    .catch(err => {
      console.error("❌ Search error:", err);
      alert("Error while searching location. Check console for details.");
    });
});

// Allow pressing Enter key to search
document.getElementById("searchBox").addEventListener("keyup", function (e) {
  if (e.key === "Enter") {
    document.getElementById("searchBtn").click();
  }
});
