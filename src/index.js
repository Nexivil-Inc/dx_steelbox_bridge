import { LiteGraph, THREE } from "global";
import { EscPartDefaultDataAutoGen, GenDeckPartModel, GenETCPartModel, GenMainPartModel, GenStPointDict, GirderStationView, InitPoint, MainPartDefaultDataAutoGen, MainPartInputFit, SectionPointDict, StationList } from "./cpbModel";
import { GenBoxGirder2D } from "./drawing";
import {
    FittingGridInput,
    GenBarrierModel,
    GenBasicSections,
    GenDeckModel,
    GenDefaultETCPartData,
    GenDiaphragmModel,
    GenGridInfo,
    GenHStiffModel,
    GenJackupModel,
    GenSectionPointDict,
    GenSpliceModel,
    GenStudModel,
    GenSupportModel,
    GenVStiffModel,
    GenXBeamModel,
} from "./model";
import { compareTest } from "./test";

export let koreanFont = null;

var gloader = new THREE.FontLoader();

export default new Promise((r, j) =>
    gloader.load("/fonts/korean.json", function (font) {
        koreanFont = font;
        console.log("loaded");
        r();
    })
);

if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != "undefined" ? args[number] : match;
        });
    };
}

/* model */
// grid
// LiteGraph.registerNodeType("model/GenGridInfo", GenGridInfo);
// LiteGraph.registerNodeType("model/FittingGridInput", FittingGridInput);
// // section
// LiteGraph.registerNodeType("model/GenBasicSections", GenBasicSections);
// LiteGraph.registerNodeType("model/GenSectionPointDict", GenSectionPointDict);
// LiteGraph.registerNodeType("model/GenDefaultETCPartData", GenDefaultETCPartData);
// // steelbox
// LiteGraph.registerNodeType("model/GenSteelBoxModel", GenMainPartModel);
// // diaphragm
// LiteGraph.registerNodeType("model/GenDiaphragmModel", GenDiaphragmModel);
// // stiffner
// LiteGraph.registerNodeType("model/GenVStiffModel", GenVStiffModel);
// LiteGraph.registerNodeType("model/GenHStiffModel", GenHStiffModel);
// // xbeam
// LiteGraph.registerNodeType("model/GenXBeamModel", GenXBeamModel);
// // splice
// LiteGraph.registerNodeType("model/GenSpliceModel", GenSpliceModel);
// // stud
// LiteGraph.registerNodeType("model/GenStudModel", GenStudModel);
// // jackup
// LiteGraph.registerNodeType("model/GenJackupModel", GenJackupModel);
// // support
// LiteGraph.registerNodeType("model/GenSupportModel", GenSupportModel);
// // deck
// LiteGraph.registerNodeType("model/GenDeckModel", GenDeckModel);
// LiteGraph.registerNodeType("model/GenBarrierModel", GenBarrierModel);

// /* drawing */
// // girder
// LiteGraph.registerNodeType("model/GenBoxGirder2D", GenBoxGirder2D);

// /* test */
// LiteGraph.registerNodeType("model/compareTest", compareTest);


/*drlim_node for CPB girder bridge*/
LiteGraph.registerNodeType("CPB/MainPartDefaultDataAutoGen", MainPartDefaultDataAutoGen);
LiteGraph.registerNodeType("CPB/EscPartDefaultDataAutoGen", EscPartDefaultDataAutoGen);
LiteGraph.registerNodeType("CPB/MainPartInputFit", MainPartInputFit);
LiteGraph.registerNodeType("CPB/GenStPointDict", GenStPointDict);
LiteGraph.registerNodeType("CPB/StationList", StationList);
LiteGraph.registerNodeType("CPB/InitPoint", InitPoint);
LiteGraph.registerNodeType("CPB/SectionPointDict", SectionPointDict);
LiteGraph.registerNodeType("CPB/GenMainPartModel", GenMainPartModel);
LiteGraph.registerNodeType("CPB/GenETCPartModel", GenETCPartModel);
LiteGraph.registerNodeType("CPB/GenDeckPartModel", GenDeckPartModel);
LiteGraph.registerNodeType("CPB/GirderStationView", GirderStationView);

