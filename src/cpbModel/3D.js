import { Extrude, GetArcPoints, Model, p, Point, PointToGlobal } from "@nexivil/package-modules";
import { toRefPoint } from "@nexivil/package-modules/src/temp";
import { THREE, BufferGeometryUtils, SpriteText } from "global";

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
export class Bolt extends Model {
    constructor(layout, bolt, refPoint, material = "default", meta = {}) {
        super(meta, material);
        this.type = "bolt";
        this.bolt = bolt;
        this.layout = layout;
        this.refPoint = refPoint ?? null;
    }
    get threeFunc() {
        return InitPoint => boltView2(this.refPoint, this.layout, this.bolt, InitPoint);
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
                positions.push(...[plist[i].x - initPoint.x, plist[i].y - initPoint.y, plist[i].z - initPoint.z]);
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
            bufferGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, positionNumComponents));

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
        let kk = isForward ? jj : smoothness + 1 - jj;
        result[0].push(plt2[0][0]);
        result[0].push(filletPoint[0][kk]);
        result[0].push(filletPoint[1][kk]);
        result[0].push(plt2[0][3]);
        result[1].push(plt2[1][0]);
        result[1].push(filletPoint[2][kk]);
        result[1].push(filletPoint[3][kk]);
        result[1].push(plt2[1][3]);
    }
    return result;
}
export function boltView2(refPoint, layout, bolt, initPoint) {
    let Geos2 = [];
    let xRotation = refPoint?.xRotation ?? 0;
    let yRotation = refPoint?.yRotation ?? 0;
    let zRotation = refPoint?.zRotation ?? 0;
    // 볼트배치 자동계산 모듈 // 2020.7.7 by drlim
    for (let i in layout) {
        let point = PointToGlobal(new Point(layout[i][0], layout[i][1]), refPoint);
        Geos2.push(boltGeometry(bolt, point, xRotation, yRotation, zRotation, initPoint));
    }
    return BufferGeometryUtils.mergeBufferGeometries(Geos2);
}

export function boltGeometry(bolt, point, xRotation, yRotation, zRotation, initPoint) {
    var radius = bolt.size / 2;
    var geometry = new THREE.CylinderBufferGeometry(radius, radius, bolt.t * 2 + bolt.l, 6, 1);
    geometry.rotateX(Math.PI / 2);
    geometry.rotateX(xRotation);
    geometry.rotateY(yRotation);
    geometry.rotateZ(zRotation);
    geometry.translate(point.x - initPoint.x, point.y - initPoint.y, point.z - initPoint.z);
    return geometry;
}

export function girderStation3D(girderStation, sectionPointDict, initPoint) {
    let modelGroup = new THREE.Group();
    let aquaPlan = new THREE.MeshBasicMaterial({ color: 0x00ffff, opacity: 0.5, transparent: true, side: THREE.DoubleSide });
    let redPlan = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true, side: THREE.DoubleSide });
    let yellowPlan = new THREE.MeshBasicMaterial({ color: 0xffff00, opacity: 0.5, transparent: true, side: THREE.DoubleSide });
    let magentaPlan = new THREE.MeshBasicMaterial({ color: 0xff00ff, opacity: 0.5, transparent: true, side: THREE.DoubleSide });
    let grayPlan = new THREE.MeshBasicMaterial({ color: 0x777777, opacity: 0.5, transparent: true, side: THREE.DoubleSide });
    let yellowLine = new THREE.LineBasicMaterial({ color: 0xffff00 });
    let redLine = new THREE.LineBasicMaterial({ color: 0xff0000 });

    for (let i in girderStation) {
        let pts = girderStation[i].map(obj => new THREE.Vector3(obj.point.x - initPoint.x, obj.point.y - initPoint.y, obj.point.z));
        let gl = new THREE.BufferGeometry().setFromPoints(pts);
        let pts2 = girderStation[i].map(
            obj => new THREE.Vector3(obj.point.x - initPoint.x, obj.point.y - initPoint.y, obj.point.z + sectionPointDict[obj.key].forward.webSide[1])
        );
        let gl2 = new THREE.BufferGeometry().setFromPoints(pts2);
        let pts3 = girderStation[i].map(
            obj => new THREE.Vector3(obj.point.x - initPoint.x, obj.point.y - initPoint.y, obj.point.z + sectionPointDict[obj.key].forward.webSide[0])
        );
        let gl3 = new THREE.BufferGeometry().setFromPoints(pts3);
        modelGroup.add(new THREE.Line(gl, redLine));
        modelGroup.add(new THREE.Line(gl2, yellowLine));
        modelGroup.add(new THREE.Line(gl3, yellowLine));

        for (let j in girderStation[i]) {
            let key = girderStation[i][j].key;
            if (key.includes("TF")) {
                for (let pts of sectionPointDict[key].forward.uflange) {
                    if (pts.length > 3) {
                        let shapeNode = [];
                        let center = { x: 0, y: 0 };
                        let l = pts.length;
                        pts.forEach(pt => (center.x += pt.x / l));
                        pts.forEach(pt => (center.y += pt.y / l));
                        pts.forEach(pt => shapeNode.push(p(center.x + (pt.x - center.x) * 1.2, center.y + (pt.y - center.y) * 20)));
                        let point = girderStation[i][j].point;
                        let shape = new THREE.Shape();
                        let shapeNodeVectors = [];
                        for (let i = 0; i < shapeNode.length; i++) {
                            shapeNodeVectors.push(new THREE.Vector2(shapeNode[i].x, shapeNode[i].y));
                        }
                        shape.setFromPoints(shapeNodeVectors);
                        let geometry = new THREE.ShapeGeometry(shape);
                        let rad = Math.atan2(-point.normalCos, point.normalSin) + Math.PI / 2; //+
                        // geometry.rotateY(rotationY)
                        geometry.rotateX(Math.PI / 2);
                        geometry.rotateZ(rad);
                        geometry.translate(point.x - initPoint.x, point.y - initPoint.y, point.z - initPoint.z);
                        modelGroup.add(new THREE.Mesh(geometry, aquaPlan));
                    }
                }
            } else if (key.includes("BF")) {
                for (let pts of sectionPointDict[key].forward.lflange) {
                    if (pts.length > 3) {
                        let shapeNode = [];
                        let center = { x: 0, y: 0 };
                        let l = pts.length;
                        pts.forEach(pt => (center.x += pt.x / l));
                        pts.forEach(pt => (center.y += pt.y / l));
                        pts.forEach(pt => shapeNode.push(p(center.x + (pt.x - center.x) * 1.2, center.y + (pt.y - center.y) * 20)));
                        let point = girderStation[i][j].point;
                        let shape = new THREE.Shape();
                        let shapeNodeVectors = [];
                        for (let i = 0; i < shapeNode.length; i++) {
                            shapeNodeVectors.push(new THREE.Vector2(shapeNode[i].x, shapeNode[i].y));
                        }
                        shape.setFromPoints(shapeNodeVectors);
                        let geometry = new THREE.ShapeGeometry(shape);
                        let rad = Math.atan2(-point.normalCos, point.normalSin) + Math.PI / 2; //+
                        // geometry.rotateY(rotationY)
                        geometry.rotateX(Math.PI / 2);
                        geometry.rotateZ(rad);
                        geometry.translate(point.x - initPoint.x, point.y - initPoint.y, point.z - initPoint.z);
                        modelGroup.add(new THREE.Mesh(geometry, redPlan));
                    }
                }
            } else if (key.includes("WF")) {
                for (let pts of sectionPointDict[key].forward.web) {
                    if (pts.length > 3) {
                        let shapeNode = [];
                        let center = { x: 0, y: 0 };
                        let l = pts.length;
                        pts.forEach(pt => (center.x += pt.x / l));
                        pts.forEach(pt => (center.y += pt.y / l));
                        pts.forEach(pt => shapeNode.push(p(center.x + (pt.x - center.x) * 20, center.y + (pt.y - center.y) * 1.2)));
                        let point = girderStation[i][j].point;
                        let shape = new THREE.Shape();
                        let shapeNodeVectors = [];
                        for (let i = 0; i < shapeNode.length; i++) {
                            shapeNodeVectors.push(new THREE.Vector2(shapeNode[i].x, shapeNode[i].y));
                        }
                        shape.setFromPoints(shapeNodeVectors);
                        let geometry = new THREE.ShapeGeometry(shape);
                        let rad = Math.atan2(-point.normalCos, point.normalSin) + Math.PI / 2; //+
                        // geometry.rotateY(rotationY)
                        geometry.rotateX(Math.PI / 2);
                        geometry.rotateZ(rad);
                        geometry.translate(point.x - initPoint.x, point.y - initPoint.y, point.z - initPoint.z);
                        modelGroup.add(new THREE.Mesh(geometry, yellowPlan));
                    }
                }
            } else if (key.includes("SP")) {
                let shapeNode = [new Point(-1500, 0), new Point(1500, 0), new Point(1500, -3000), new Point(-1500, -3000)];
                let point = girderStation[i][j].point;
                let shape = new THREE.Shape();
                let shapeNodeVectors = [];
                for (let i = 0; i < shapeNode.length; i++) {
                    shapeNodeVectors.push(new THREE.Vector2(shapeNode[i].x, shapeNode[i].y));
                }
                shape.setFromPoints(shapeNodeVectors);
                let geometry = new THREE.ShapeGeometry(shape);
                let rad = Math.atan2(-point.normalCos, point.normalSin) + Math.PI / 2; //+
                // geometry.rotateY(rotationY)
                geometry.rotateX(Math.PI / 2);
                geometry.rotateZ(rad);
                geometry.translate(point.x - initPoint.x, point.y - initPoint.y, point.z - initPoint.z);
                modelGroup.add(new THREE.Mesh(geometry, magentaPlan));
            } else if (["D", "V"].some(k => key.includes(k))) {
                let shapeNode = [new Point(-1500, 0), new Point(1500, 0), new Point(1500, -3000), new Point(-1500, -3000)];
                let point = toRefPoint(girderStation[i][j].point, true);
                let shape = new THREE.Shape();
                let shapeNodeVectors = [];
                for (let i = 0; i < shapeNode.length; i++) {
                    shapeNodeVectors.push(new THREE.Vector2(shapeNode[i].x, shapeNode[i].y));
                }
                shape.setFromPoints(shapeNodeVectors);
                let geometry = new THREE.ShapeGeometry(shape);
                let rad = Math.atan2(-point.normalCos, point.normalSin) + Math.PI / 2; //+
                // geometry.rotateY(rotationY)
                geometry.rotateX(Math.PI / 2);
                geometry.rotateZ(rad);
                geometry.translate(point.x - initPoint.x, point.y - initPoint.y, point.z - initPoint.z);
                modelGroup.add(new THREE.Mesh(geometry, grayPlan));
            }
        }
    }
    return modelGroup;
}

export function GridView3D(girderStation, sectionPointDict, initPoint) {
    let modelGroup = new THREE.Group();
    let layer = 0;
    let aquaLine = new THREE.LineBasicMaterial({ color: 0x00ffff });
    for (let i in girderStation) {
        let upperPts = [];
        let lowerPts = [];
        for (let j in girderStation[i]) {
            let key = girderStation[i][j].key;
            let dz = 0;
            let dz2 = 0;
            let textDz = 0;
            let textcolor = "white";
            let bool = false;
            // let pt;
            if (key.includes("D") || key.includes("V") || key.includes("SP")) {
                dz = 1000;
                dz2 = 0;
                if (key.includes("SP")) {
                    textcolor = "green";
                    textDz = 100;
                } else if (key.includes("F")) {
                    textcolor = "yellow";
                    textDz = 100;
                } else if (key.includes("TW")) {
                    textcolor = "red";
                    textDz = 200;
                } else if (key.includes("TR")) {
                    textcolor = "magenta";
                    textDz = 300;
                }
                let pt0 = new THREE.Vector3(
                    girderStation[i][j].point.x - initPoint.x,
                    girderStation[i][j].point.y - initPoint.y,
                    girderStation[i][j].point.z + dz - 100
                );
                upperPts.push({ girderStation: girderStation[i][j].point.girderStation, point: pt0 });
                bool = true;
            } else if (key.includes("LC") || key.includes("H")) {
                dz = -4000;
                dz2 = -3000;
                if (key.includes("LC")) {
                    textcolor = "green";
                    textDz = -100;
                } else if (key.includes("H")) {
                    textcolor = "yellow";
                    textDz = -100;
                } else if (key.includes("BW")) {
                    textcolor = "red";
                    textDz = -200;
                } else if (key.includes("BR")) {
                    textcolor = "magenta";
                    textDz = -300;
                }
                let pt0 = new THREE.Vector3(
                    girderStation[i][j].point.x - initPoint.x,
                    girderStation[i][j].point.y - initPoint.y,
                    girderStation[i][j].point.z + dz + 100
                );
                lowerPts.push({ girderStation: girderStation[i][j].point.girderStation, point: pt0 });
                bool = true;
            }
            if (bool) {
                let pt = new THREE.Vector3(
                    girderStation[i][j].point.x - initPoint.x,
                    girderStation[i][j].point.y - initPoint.y,
                    girderStation[i][j].point.z + dz
                );
                let text = new SpriteText(key, 100, textcolor);
                text.position.set(pt.x, pt.y, pt.z + textDz);
                text.layers.set(layer);
                // text.backgroundColor = "red"
                modelGroup.add(text);
                let pt2 = new THREE.Vector3(
                    girderStation[i][j].point.x - initPoint.x,
                    girderStation[i][j].point.y - initPoint.y,
                    girderStation[i][j].point.z + dz2
                );
                let geo = new THREE.BufferGeometry().setFromPoints([pt, pt2]);
                modelGroup.add(new THREE.Line(geo, aquaLine));
            }
        }
        for (let k = 0; k < upperPts.length - 1; k++) {
            let dist = upperPts[k + 1].girderStation - upperPts[k].girderStation;
            let p1 = upperPts[k + 1].point;
            let p2 = upperPts[k].point;
            if (dist > 0.1) {
                let text = new SpriteText(dist.toFixed(0), 100, "green");
                text.position.set((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, (p1.z + p2.z) / 2 + 100);
                text.layers.set(layer);
                // text.backgroundColor = "red"
                modelGroup.add(text);
                let geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                modelGroup.add(new THREE.Line(geo, aquaLine));
            }
        }
        for (let k = 0; k < lowerPts.length - 1; k++) {
            let dist = lowerPts[k + 1].girderStation - lowerPts[k].girderStation;
            let p1 = lowerPts[k + 1].point;
            let p2 = lowerPts[k].point;
            if (dist > 0.1) {
                let text = new SpriteText(dist.toFixed(0), 150, "green");
                text.position.set((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, (p1.z + p2.z) / 2 + 100);
                text.layers.set(layer);
                // text.backgroundColor = "red"
                modelGroup.add(text);
                let geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                modelGroup.add(new THREE.Line(geo, aquaLine));
            }
        }
    }
    return modelGroup;
}
