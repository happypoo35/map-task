import { useEffect, useRef, useState } from "react";
import { FiPlus, FiEye, FiEyeOff, FiTrash2 } from "react-icons/fi";
import maplibre from "maplibre-gl";
import { Tooltip } from "./tooltip";

import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./map.module.scss";

const primaryColor = "#252525";
const secondaryColor = "#FFF";

type Point = {
  dateAdded: string;
  coords: [number, number];
};
type Line = {
  dateAdded: string;
  coords: [number, number][];
};
type Props = {
  centerLng: number;
  centerLtd: number;
  defaultZoom: number;
};

const localPoints = localStorage.getItem("points");
const localLines = localStorage.getItem("lines");
const initPoints: Point[] = localPoints === null ? [] : JSON.parse(localPoints);
const initLines: Line[] = localLines === null ? [] : JSON.parse(localLines);

export const Map = ({ centerLng, centerLtd, defaultZoom }: Props) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibre.Map | null>(null);
  const popup = useRef<maplibre.Popup | null>(null);

  const [addState, setAddState] = useState<"point" | "line" | null>(null);
  const [activeLayers, setActiveLayers] = useState({
    points: true,
    lines: true,
  });
  const [points, setPoints] = useState(initPoints);
  const [lines, setLines] = useState(initLines);
  const [newLine, setNewLine] = useState<
    { marker: maplibre.Marker; coords: [number, number] }[]
  >([]);

  // Init Map
  useEffect(() => {
    if (map.current) return;
    if (mapContainer.current) {
      map.current = new maplibre.Map({
        container: mapContainer.current,
        style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${
          import.meta.env.VITE_API_KEY
        }`,
        center: [centerLng, centerLtd],
        zoom: defaultZoom,
      });

      popup.current = new maplibre.Popup({
        closeButton: true,
        className: styles.popup,
      });

      const mapEl = map.current;
      const popupEl = popup.current;

      mapEl.addControl(new maplibre.NavigationControl(), "top-left");

      mapEl.on("load", () => {
        // Overwrite default Cursor
        mapEl.getCanvas().style.cursor = "default";
        mapEl.on("drag", function () {
          mapEl.getCanvas().style.cursor = "grab";
        });
        mapEl.on("dragend", function () {
          mapEl.getCanvas().style.cursor = "default";
        });

        // Init Points
        mapEl.addSource("points", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: points.map((point) => ({
              type: "Feature",
              properties: {
                dateAdded: point.dateAdded,
              },
              geometry: {
                type: "Point",
                coordinates: point.coords,
              },
            })),
          },
        });

        mapEl.addLayer({
          id: "points",
          type: "circle",
          source: "points",
          paint: {
            "circle-radius": 6,
            "circle-stroke-width": 4,
            "circle-stroke-color": primaryColor,
            "circle-color": secondaryColor,
          },
        });

        // Init Lines
        mapEl.addSource("lines", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: lines.flatMap((line) => [
              {
                type: "Feature",
                properties: {
                  dateAdded: line.dateAdded,
                },
                geometry: {
                  type: "LineString",
                  coordinates: line.coords,
                },
              },
              {
                type: "Feature",
                properties: {
                  dateAdded: line.dateAdded,
                },
                geometry: {
                  type: "Point",
                  coordinates: line.coords[0],
                },
              },
              {
                type: "Feature",
                properties: {
                  dateAdded: line.dateAdded,
                },
                geometry: {
                  type: "Point",
                  coordinates: line.coords[1],
                },
              },
            ]),
          },
        });

        mapEl.addLayer({
          id: "lines",
          type: "line",
          source: "lines",
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": primaryColor,
            "line-width": 3,
          },
          filter: ["==", "$type", "LineString"],
        });

        mapEl.addLayer({
          id: "linesCaps",
          type: "circle",
          source: "lines",
          paint: {
            "circle-stroke-width": 3,
            "circle-radius": 4,
            "circle-color": secondaryColor,
            "circle-stroke-color": primaryColor,
          },
          filter: ["==", "$type", "Point"],
        });

        // Popup Events
        const mouseEnterCB = () => {
          mapEl.getCanvas().style.cursor = "pointer";
        };
        const mouseLeaveCB = () => {
          mapEl.getCanvas().style.cursor = "default";
        };
        const mouseClickCB = (
          e: maplibre.MapMouseEvent & {
            features?: maplibre.MapGeoJSONFeature[];
          }
        ) => {
          if (e.features) {
            const dateAdded = e.features[0].properties.dateAdded;

            if (e.features[0].geometry.type === "Point") {
              const coords = e.features[0].geometry.coordinates as [
                number,
                number
              ];

              popupEl.setLngLat(coords).setHTML(dateAdded).addTo(mapEl);
            } else if (e.features[0].geometry.type === "LineString") {
              popupEl.setLngLat(e.lngLat).setHTML(dateAdded).addTo(mapEl);
            }
          }
        };

        ["points", "linesCaps", "lines"].forEach((name) => {
          mapEl.on("mouseenter", name, mouseEnterCB);
          mapEl.on("mouseleave", name, mouseLeaveCB);
          mapEl.on("click", name, mouseClickCB);
        });
      });
    }
  });

  // Update points
  useEffect(() => {
    if (!map.current) return;
    const mapEl = map.current;

    const source = mapEl.getSource("points") as maplibre.GeoJSONSource;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: points.map((point) => ({
          type: "Feature",
          properties: {
            dateAdded: point.dateAdded,
          },
          geometry: {
            type: "Point",
            coordinates: point.coords,
          },
        })),
      });

      localStorage.setItem("points", JSON.stringify(points));
    }
  }, [points]);

  // Update lines
  useEffect(() => {
    if (!map.current) return;
    const mapEl = map.current;

    const source = mapEl.getSource("lines") as maplibre.GeoJSONSource;
    const linesCapsSource = mapEl.getSource(
      "linesCaps"
    ) as maplibre.GeoJSONSource;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: lines.flatMap((line) => [
          {
            type: "Feature",
            properties: {
              dateAdded: line.dateAdded,
            },
            geometry: {
              type: "LineString",
              coordinates: line.coords,
            },
          },
          {
            type: "Feature",
            properties: {
              dateAdded: line.dateAdded,
            },
            geometry: {
              type: "Point",
              coordinates: line.coords[0],
            },
          },
          {
            type: "Feature",
            properties: {
              dateAdded: line.dateAdded,
            },
            geometry: {
              type: "Point",
              coordinates: line.coords[1],
            },
          },
        ]),
      });

      localStorage.setItem("lines", JSON.stringify(lines));
    }

    if (linesCapsSource) {
      linesCapsSource.setData({
        type: "FeatureCollection",
        features: lines.flatMap((line) =>
          line.coords.map((point) => ({
            type: "Feature",
            properties: {
              dateAdded: line.dateAdded,
            },
            geometry: {
              type: "Point",
              coordinates: point,
            },
          }))
        ),
      });
    }
  }, [lines]);

  // Add points to state
  useEffect(() => {
    if (!map.current || addState !== "point") return;
    const mapEl = map.current;

    const cb = (e: maplibre.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      const dateAdded = new Date().toLocaleDateString("ru");
      setPoints((p) => [...p, { dateAdded, coords: [lng, lat] }]);
      setAddState(null);
    };

    mapEl.on("click", cb);

    return () => {
      mapEl.off("click", cb);
    };
  }, [addState]);

  // Add lines to state
  useEffect(() => {
    if (!map.current || addState !== "line") return;
    const mapEl = map.current;

    const cb = (e: maplibre.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;

      const marker = new maplibre.Marker({
        element: document.createElement("div"),
        className: styles.marker,
      })
        .setLngLat([lng, lat])
        .addTo(mapEl);

      setNewLine((p) => {
        if (p.length < 2) {
          return [...p, { marker, coords: [lng, lat] }];
        } else {
          return p;
        }
      });
    };

    mapEl.on("click", cb);
    if (newLine.length === 2) {
      const dateAdded = new Date().toLocaleDateString("ru");
      setLines((p) => [
        ...p,
        { dateAdded, coords: newLine.map((line) => line.coords) },
      ]);
      newLine.forEach((line) => line.marker.remove());
      setNewLine([]);
      setAddState(null);
    }

    return () => {
      mapEl.off("click", cb);
    };
  }, [addState, newLine]);

  // Clear New Line
  const clearNewLine = () => {
    if (newLine.length) {
      newLine.forEach((line) => line.marker.remove());
      setNewLine([]);
    }
  };

  // Clear Popup
  const clearPopup = () => {
    if (popup.current) {
      popup.current.remove();
    }
  };

  // Toggle Layer Visibility
  const toggleVisibility = (layers: string[]) => {
    if (!map.current) return;
    const mapEl = map.current;

    layers.forEach((layer) => {
      const isVisible = mapEl.getLayoutProperty(layer, "visibility");
      mapEl.setLayoutProperty(
        layer,
        "visibility",
        isVisible === "none" ? "visible" : "none"
      );
    });
  };

  const handleToggle = (layer: "points" | "lines") => {
    if (layer === "points") {
      toggleVisibility(["points"]);
    } else {
      toggleVisibility(["lines", "linesCaps"]);
      clearNewLine();
    }
    setActiveLayers((p) => ({ ...p, [layer]: !p[layer] }));
    clearPopup();
  };

  // Add Object To Map
  const handleAdd = (name: "point" | "line") => {
    setAddState(name);
    clearNewLine();
    clearPopup();
  };

  // Delete Object From Map
  const handleDelete = (layer: "points" | "lines") => {
    if (layer === "lines") {
      setLines([]);
      clearNewLine();
    } else {
      setPoints([]);
    }
    localStorage.removeItem(layer);
    clearPopup();
  };

  const elements = [
    ["point", "points"],
    ["line", "lines"],
  ] as const;

  return (
    <div className={styles.wrapper}>
      <div className={styles.controls}>
        {elements.map(([name, layer]) => (
          <div
            key={name}
            className={styles.control}
            data-hidden={!activeLayers[layer] || undefined}
          >
            <button title="Скрыть слой" onClick={() => handleToggle(layer)}>
              {activeLayers[layer] ? <FiEye /> : <FiEyeOff />}
              {name === "point" ? "Точки" : "Линии"}
            </button>
            <button title="Добавить точку" onClick={() => handleAdd(name)}>
              <FiPlus />
            </button>
            <button title="Удалить точки" onClick={() => handleDelete(layer)}>
              <FiTrash2 />
            </button>
          </div>
        ))}
      </div>
      <Tooltip addState={addState} newLineLength={newLine.length} />
      <div ref={mapContainer} className={styles.map} />
    </div>
  );
};
