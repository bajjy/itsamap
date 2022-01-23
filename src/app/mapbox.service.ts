import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

import * as mapboxgl from 'mapbox-gl';
import * as polyline from '@mapbox/polyline';
import { environment } from "../environments/environment";

@Injectable({
  providedIn: 'root'
})

export class MapboxService {
  cellIdUrl = 'assets/data.json';
  map: any;
  mapSource: any;
  directions: any;
  popup: any;
  style = 'mapbox://styles/mapbox/streets-v11';
  lat = 52.529047;
  lng = 13.3645157;
  zoom = 11.5;
  route = [];
  segments: { points: [number, number][]; quality: number; }[][] = [];
  cellId = {};
  cellsShown: boolean = false;

  constructor(private http: HttpClient) {
    (mapboxgl as any).accessToken = environment.mapbox.accessToken;
  }

  getCellId() {
    return this.http.get(this.cellIdUrl);
  };
  createCellId() {
    this.getCellId()
      .subscribe((data: Record<never, never>) => {
        this.cellId = data;
        this.setCellIdLayer();
      });
  };
  setCellIdLayer() {
    this.map.addLayer({
      id: 'cells',
      type: 'circle',
      source: {
        type: 'geojson',
        data: this.cellId,
      },
      layout: {
        'visibility': 'none'
      },
      paint: {
        'circle-radius': 12,
        'circle-color': '#ff00d4',
        'circle-opacity': 0.15
      },
    });

    const displayPopup = (e: mapboxgl.EventData) => {
      const feature = e.features[0];
      this.map.getCanvas().style.cursor = 'pointer';

      const coordinates = feature.geometry.coordinates.slice();
      const description = `
        <p>
          <small>radio: </small>
          <span>${feature.properties.radio}</span>
        </p>
        <p>
          <small>area: </small>
          <span>${feature.properties.area}</span>
        </p>
        <p>
          <small>coord: </small>
          <span>${feature.geometry.coordinates.join(', ')}</span>
        </p>
      `;

      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      this.popup.setLngLat(coordinates).setHTML(description).addTo(this.map);
    };

    this.map.on('mousedown', 'cells', (e: mapboxgl.EventData) => displayPopup(e));

    this.map.on('mouseleave', 'places', () => {
      this.map.getCanvas().style.cursor = '';
      this.popup.remove();
    });
  };
  showCells(show: boolean) {
    this.popup.remove();
    this.cellsShown = show;
    this.map.setLayoutProperty('cells', 'visibility', show ? 'visible' : 'none');
  };
  clearMap() {
    this.popup.remove();
    this.directions.clearRoutes();
    this.route.length && this.clearMapSourceLayer(this.route.length);
    this.segments = [];
    this.route = [];
  };
  clearMapSourceLayer(length: number) {
    let index = 0;

    while (index < length) {
      this.map.removeLayer(`linesId${index}`);
      this.map.removeSource(`routeSource${index}`);
      index++;
    }
  };
  setMapSourceLayer() {
    const colorMap = ['#04ed59', '#edc700', '#ed9c00', '#c90505'];
    const mapFeature = (color: number, coordinates: [number, number][]) => {
      return {
        type: 'Feature',
        properties: {
          color: colorMap[color],
        },
        geometry: {
          type: 'LineString',
          coordinates,
        }
      }
    };
    const mapSource = (features: Record<never, never>) => {
      return {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features,
        }
      }
    };
    const mapLayer = (index: number) => {
      return {
        id: `linesId${index}`,
        type: 'line',
        source: `routeSource${index}`,
        'layout': {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-width': 7,
          'line-color': ['get', 'color'],
          'line-opacity': 0.75,
        }
      }
    };

    this.segments.forEach((segment, index) => {
      this.map.addSource(
        `routeSource${index}`,
        mapSource(segment.map(el => mapFeature(el.quality, el.points)))
      );

      this.map.addLayer(mapLayer(index));
    })
  };

  buildMap() {
    const generateSegments = (points: [number, number][]) => {
      const segments = [];
      const min = 1;
      const max = 20;

      while (points.length > 0) {
        segments.push({
          points: points.splice(
            0,
            Math.min(
              max,
              Math.floor((Math.random() * max) + min)
            )
          ),
          quality: Math.round(Math.random() * 3),
        });
      };
      return segments;
    };

    // @ts-ignore
    this.directions = new MapboxDirections({
      accessToken: environment.mapbox.accessToken,
      unit: 'metric',
      profile: 'mapbox/driving',
      alternatives: true,
      waypoint_targets: true,
      steps: true,
    });


    this.popup = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false
    });

    this.map = new mapboxgl.Map({
      container: 'map',
      style: this.style,
      zoom: this.zoom,
      center: [this.lng, this.lat]
    })

    this.map.addControl(new mapboxgl.NavigationControl());
    this.map.addControl(this.directions, 'top-left');

    this.createCellId();

    this.directions.on('route', (routes: any) => {
      this.route.length && this.clearMapSourceLayer(this.route.length);

      this.route = routes.route;
      this.segments = [];
      this.route.forEach((route: { geometry: string }) => {
        const pointList = polyline.toGeoJSON(route.geometry).coordinates as [number, number][];
        this.segments.push(generateSegments(pointList));
      });

      this.setMapSourceLayer();
      this.directions.removeRoutes();
    })
  }
}
