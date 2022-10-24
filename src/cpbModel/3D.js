import { Extrude, GetArcPoints, Model } from "@nexivil/package-modules";
import {THREE, BufferGeometryUtils} from 'global'

export class SteelBox extends Model {
    constructor(points, thickness, option = {}, material = "default", meta = {}) {
        super(meta, material);
        this.type = "steelbox";
        this.points = points;
        this.thickness = thickness;
    }

    get threeFunc() {
        return initPoint => SteelBoxView(this.points, initPoint);
    }
}


export function SteelBoxView(steelBoxDict, initPoint) {
    // let group = new THREE.Group();
    let pk1 = "";
    let pk2 = "";
    let Geos = [];
    steelBoxDict.forEach(function (plist, index) {
      if (plist.length > 0) {
        let bufferGeometry = new THREE.BufferGeometry();
        const positions = [];
        const Index = [];
        for (let i = 0; i < plist.length; i++) {
          positions.push(
            ...[
              plist[i].x - initPoint.x,
              plist[i].y - initPoint.y,
              plist[i].z - initPoint.z,
            ]
          );
        }
  
        for (let i = 0; i < plist.length / 4 - 1; i++) {
          for (let j = 0; j < 4; j++) {
            let k = j + 1 === 4 ? 0 : j + 1;
            Index.push(...[i * 4 + j, i * 4 + k, (i + 1) * 4 + j]);
            Index.push(...[i * 4 + k, (i + 1) * 4 + k, (i + 1) * 4 + j]);
          }
          if (i === 0) {
            Index.push(...[0, 1, 2]);
            Index.push(...[0, 2, 3]);
          } else if (i === plist.length / 4 - 2) {
            Index.push(...[(i + 1) * 4, (i + 1) * 4 + 1, (i + 1) * 4 + 2]);
            Index.push(...[(i + 1) * 4, (i + 1) * 4 + 2, (i + 1) * 4 + 3]);
          }
        }
  
        const positionNumComponents = 3;
        bufferGeometry.setIndex(Index);
        bufferGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(positions, positionNumComponents)
        );
  
        bufferGeometry.computeVertexNormals();
  
        Geos.push(bufferGeometry);
      }
    });
    let mGeo;
    if (Geos.length !== 0) {
      mGeo = BufferGeometryUtils.mergeBufferGeometries(Geos);
    }
    // group.add(new THREE.Mesh(mGeo, gStBOXmeshMaterial));
    return mGeo;
  }

  export function FilletPoints(plate1, plate2, isForward, radius, smoothness) {
    let filletPoint = [[], [], [], []];
  
    let plt1 = isForward ? plate1 : plate2;
    let plt2 = isForward ? plate2 : plate1;
    let result = [[], []];
  
    for (let ii = 0; ii < 2; ii++) {
      let p1 = new THREE.Vector3(plt1[0][ii + 1].x, plt1[0][ii + 1].y, plt1[0][ii + 1].z);
      let p2 = new THREE.Vector3(plt2[0][ii + 1].x, plt2[0][ii + 1].y, plt2[0][ii + 1].z);
      let p3 = new THREE.Vector3(plt2[1][ii + 1].x, plt2[1][ii + 1].y, plt2[1][ii + 1].z);
      filletPoint[ii] = GetArcPoints(p1, p2, p3, radius, smoothness);
    }
    for (let ii = 0; ii < 2; ii++) {
      let p1 = new THREE.Vector3(plt1[1][ii + 1].x, plt1[1][ii + 1].y, plt1[1][ii + 1].z);
      let p2 = new THREE.Vector3(plt2[1][ii + 1].x, plt2[1][ii + 1].y, plt2[1][ii + 1].z);
      let p3 = new THREE.Vector3(plt2[0][ii + 1].x, plt2[0][ii + 1].y, plt2[0][ii + 1].z);
      filletPoint[ii + 2] = GetArcPoints(p1, p2, p3, radius, smoothness);
    }
    for (let jj = 0; jj < smoothness + 2; jj++) {
      let kk = isForward ? jj : smoothness + 1 - jj
      result[0].push(plt2[0][0])
      result[0].push(filletPoint[0][kk])
      result[0].push(filletPoint[1][kk])
      result[0].push(plt2[0][3])
      result[1].push(plt2[1][0])
      result[1].push(filletPoint[2][kk])
      result[1].push(filletPoint[3][kk])
      result[1].push(plt2[1][3])
    }
    return result
  }