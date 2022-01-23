import { Component, OnInit } from '@angular/core';
import { MapboxService } from "../mapbox.service";

@Component({
  selector: 'app-mapbox',
  templateUrl: './mapbox.component.html',
  styleUrls: ['./mapbox.component.less'],
})
export class MapboxComponent implements OnInit {
  isLeft: boolean = true;

  constructor(private map: MapboxService) {

  }

  ngOnInit() {
    this.map.buildMap()
  }
  clearMap() {
    this.map.clearMap()
  }
  celularMode() {
    this.isLeft = !this.isLeft;
    this.map.showCells(!this.isLeft);
  }
  resetMode() {
    this.isLeft = true;
    this.map.showCells(!this.isLeft);
    this.clearMap();
  }
}
