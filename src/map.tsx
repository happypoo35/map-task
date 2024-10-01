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

      const mapEl = map.current;
      const popup = new maplibre.Popup({
        closeButton: true,
        className: styles.popup,
      });

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

              popup.setLngLat(coords).setHTML(dateAdded).addTo(mapEl);
            } else if (e.features[0].geometry.type === "LineString") {
              popup.setLngLat(e.lngLat).setHTML(dateAdded).addTo(mapEl);
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

    localStorage.setItem("lines", JSON.stringify(lines));
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

  return (
    <div className={styles.wrapper}>
      <div className={styles.controls}>
        <div
          className={styles.control}
          data-hidden={!activeLayers.points || undefined}
        >
          <button
            title="Скрыть слой"
            onClick={() => {
              toggleVisibility(["points"]);
              setActiveLayers((p) => ({ ...p, points: !p.points }));
            }}
          >
            {activeLayers.points ? <FiEye /> : <FiEyeOff />}
            Точки
          </button>
          <button
            title="Добавить точку"
            onClick={() => {
              setAddState("point");
              clearNewLine();
            }}
          >
            <FiPlus />
          </button>
          <button
            title="Удалить точки"
            onClick={() => {
              setPoints([]);
              localStorage.removeItem("points");
            }}
          >
            <FiTrash2 />
          </button>
        </div>
        <div
          className={styles.control}
          data-hidden={!activeLayers.lines || undefined}
        >
          <button
            title="Скрыть слой"
            onClick={() => {
              toggleVisibility(["lines", "linesCaps"]);
              setActiveLayers((p) => ({ ...p, lines: !p.lines }));
              clearNewLine();
            }}
          >
            {activeLayers.lines ? <FiEye /> : <FiEyeOff />}
            Линии
          </button>
          <button
            title="Добавить линию"
            onClick={() => {
              setAddState("line");
              clearNewLine();
            }}
          >
            <FiPlus />
          </button>
          <button
            title="Удалить линии"
            onClick={() => {
              setLines([]);
              localStorage.removeItem("lines");
              clearNewLine();
            }}
          >
            <FiTrash2 />
          </button>
        </div>
      </div>
      <Tooltip addState={addState} newLineLength={newLine.length} />
      <div ref={mapContainer} className={styles.map} />
    </div>
  );
};
