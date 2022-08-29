import { THREE, BufferGeometryUtils } from "global";

export function GenSteelBoxGeometry(steelBoxDict, initPoint) {
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
    return mGeo;
}

export function GenBoltGeometry(Thickness, zPosition, rotationY, rotationX, point, bolt, initPoint) {
    let geometryArr = [];
    let new_rotationY = rotationY + Math.PI / 2;
    // 볼트배치 자동계산 모듈 // 2020.7.7 by drlim
    let boltZ = bolt.isUpper ? zPosition + Thickness - bolt.l / 2 : zPosition + bolt.l / 2;
    for (let i in bolt.layout) {
        var radius = bolt.size / 2;
        // var rad = Math.atan2(-point.normalCos, point.normalSin) + Math.PI / 2;
        var geometry = new THREE.CylinderBufferGeometry(radius, radius, bolt.t * 2 + bolt.l, 6, 1);
        geometry.rotateZ(Math.PI / 2);
        geometry.translate(-boltZ, bolt.layout[i][1], bolt.layout[i][0]);
        geometry.rotateY(new_rotationY);
        geometry.rotateX(rotationX);
        geometry.rotateZ(point.zRotation);
        geometry.translate(point.x - initPoint.x, point.y - initPoint.y, point.z - initPoint.z);
        geometryArr.push(geometry);
    }
    return BufferGeometryUtils.mergeBufferGeometries(geometryArr);
}
