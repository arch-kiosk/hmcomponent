import {
    ERR_CONTRADICTION,
    ERR_CYCLE,
    ERR_FAULTY,
    ERR_MISSING_REVERSE,
    ERR_MULTIPLE,
    ERR_NON_TEMPORAL_RELATION,
    hmNode
} from "./hm";
import { AnyDict } from "./hmlabtypes";

export const LATER = "later";
export const EARLIER = "earlier";
export const SAME = "same time as";

export type ApiResultLocusRelationsHeaders = Array<string>

export type ApiResultLocusRelationsRelation = Array<any>

export type ApiResultLocusRelationsLocus = Array<any>

export interface ApiResultLocusRelations {
    result: Boolean;
    relation_headers: ApiResultLocusRelationsHeaders;
    locus_headers: ApiResultLocusRelationsHeaders;
    loci: Array<ApiResultLocusRelationsLocus>;
    relations: Array<ApiResultLocusRelationsRelation>;
}

export class LocusRelation {
    id: string; // local nano-id of relation
    uid_locus: string;  //uid of relating locus
    arch_context: string;
    chronology: string; // chronological relation type
    relation_type: string; //spatial relation type
    uid_locus_related: string; //uid of related locus
    related_arch_context: string;
    uid_sketch: string;
    sketch_description: string;
    created: string;
    modified: string;
    modified_by: string;

    constructor(id: string) {
        this.id = id;
    }
}

export type DroppedRelation = {
    locusRelation: LocusRelation,
    reason: number
}

export class Locus {
    "uid": string;
    "arch_context": string;
    "alternate_id": string;
    "description": string;
    "type": string;
    "tags": string;
    "created": string;
    "modified": string;
    "modified_by": string;
}

export function getChronType(chronType: string, relationType: string) {

    let supportedChronTypes = [LATER, EARLIER, SAME];
    if (!chronType || !supportedChronTypes.find(t => chronType.startsWith(t))) {
        switch (relationType) {
            case "abuts":
                chronType = LATER;
                break;
            case "cuts through":
                chronType = LATER;
                break;
            case "cut":
                chronType = EARLIER;
                break;
            case "cut by":
                chronType = EARLIER;
                break;
            case "above":
                chronType = LATER;
                break;
            case "below":
                chronType = EARLIER;
                break;
            case "bonds with":
                chronType = SAME;
                break;
            case "is abutted by":
                chronType = EARLIER;
                break;
            case "is adjacent to":
                chronType = "";
                break;
            default:
                chronType = "";
                console.error(`The chron type ${chronType} is not supported and neither is the relation type ${relationType}`);
        }
    } else {
        if (chronType) {
            chronType = supportedChronTypes.find(t => chronType.startsWith(t))
        }
    }

    return chronType;
}

export function apiResult2Relations(apiData: ApiResultLocusRelations, loci: Array<Locus>, errorOnUnknownField = false,
                                    requestedLocusUID = ""): Array<LocusRelation> {
    const relations: Array<LocusRelation> = [];
    const knownFields = ["uid_locus", "arch_context", "chronology", "relation_type",
        "uid_locus_related", "uid_sketch", "sketch_description", "created", "modified", "modified_by"];

    apiData.relations.forEach(function(apiRelation, relationNr) {
        const locusRelation = new LocusRelation(relationNr.toString());
        apiData.relation_headers.forEach((name, fieldIdx) => {
            switch (name) {
                case "uid":
                    locusRelation.uid_locus = apiRelation[fieldIdx];
                    break;
                case "uid_locus_2_related":
                    locusRelation.uid_locus_related = apiRelation[fieldIdx];
                    const relatedLocus = loci.find((x) => x.uid === locusRelation.uid_locus_related);
                    locusRelation.related_arch_context = relatedLocus ? relatedLocus.arch_context : "";
                    break;
                case "chronology":
                    locusRelation.chronology = apiRelation[fieldIdx] ? apiRelation[fieldIdx].toLowerCase() : "";
                    [LATER, EARLIER, SAME].forEach(function(c) {
                        if (locusRelation.chronology.startsWith(c))
                            locusRelation.chronology = c;
                    });
                    break;
                case "relation_type":
                    locusRelation.relation_type = apiRelation[fieldIdx] ? apiRelation[fieldIdx].toLowerCase() : "";
                    break;
                default: {
                    if (knownFields.find(n => n === name)) {
                        (locusRelation as AnyDict)[name] = apiRelation[fieldIdx];
                    } else {
                        if (errorOnUnknownField) throw (`api returned a relation ${relationNr} with an unknown field ${name}`);
                        console.log("Unknown field ");
                    }
                }
            }
        });
        if (requestedLocusUID === "" || locusRelation.uid_locus === requestedLocusUID || locusRelation.uid_locus_related === requestedLocusUID)
            relations.push(locusRelation);
    });

    return relations;
}

export function apiResult2Loci(apiData: ApiResultLocusRelations, errorOnUnknownField = false): Array<Locus> {
    const knownFields = [
        "uid",
        "arch_context",
        "alternate_id",
        "description",
        "type",
        "tags",
        "created",
        "modified",
        "modified_by",
    ];
    const loci: Array<Locus> = [];
    apiData.loci.forEach(function(apiLocus) {
        const locus = new Locus();
        apiData.locus_headers.forEach((name, fieldIdx) => {
            if (knownFields.find(n => n === name)) {
                (locus as AnyDict)[name] = apiLocus[fieldIdx];
            } else {
                if (errorOnUnknownField) throw (`api returned a locus with an unknown field ${name}  in locus ${locus.arch_context}`);
                console.log(`Unknown field ${name} in locus ${locus.arch_context}`);
            }
        });
        loci.push(locus);
    });
    return loci;
}

// @ts-ignore
export function amendMissingLocusRelations(relations: Array<LocusRelation>) {
    //ToDo: Make sure that the other relation exists: a LATER for an EARLIER and a SAME for a SAME
    //if the opposite relation exists but does not have a contemporary type you can amend it with the matching type
    //if the opposite relation exists but does have a contradictory contemporary type or
    //the opposite relations does not exist at all, mark the relation as faulty
    //A relation that is marked faulty is not being used in api2HmNodes at all

}

export function getDroppedReasonStr(reason: Number) {
    let rc = "unknown"
    switch (reason) {
        case ERR_FAULTY:
            rc = "missing information"
            break;
        case ERR_MISSING_REVERSE:
            rc = "missing reverese relation"
            break;
        case ERR_CYCLE:
            rc = "cyclic relations"
            break;
        case ERR_CONTRADICTION:
            rc = "contradictory relations"
            break;
        case ERR_MULTIPLE:
            rc = "excess relation"
            break;
        case ERR_NON_TEMPORAL_RELATION:
            rc = "non-temporal relation"
            break;
    }
    return rc
}

export function api2HmNodes(relations: Array<LocusRelation>, loci: Array<Locus>, droppedRelations: Array<DroppedRelation>) {
    const nodes: Map<string, hmNode> = new Map();

    //todo:
    //amendMissingLocusRelations(relations)

    for (const apiRecord of relations) {
        const locusUID = apiRecord.uid_locus;
        let chronType = getChronType(apiRecord.chronology, apiRecord.relation_type);
        let node = nodes.get(locusUID);
        if (!node) {
            node = new hmNode(locusUID, [], []);
            node.name = apiRecord.arch_context;
            const locus = loci.find((locus) => locus.uid === node.id);
            node.data = locus;
            node.locusType = locus.type;
            node.tags = [];
            if (locus.tags) {
                node.tags = locus.tags.split("#");
            }
            nodes.set(locusUID, node);
        }

        if (!apiRecord.related_arch_context || apiRecord.related_arch_context === "") {
            console.log(`api2HmNodes: ${node.name} has a relation to nowhere`);
            droppedRelations.push({ locusRelation: apiRecord, reason: ERR_FAULTY });
        } else {
            if (chronType === LATER || chronType === SAME) {
                const uidRelatedLocus: string = apiRecord.uid_locus_related;
                if ((node.earlierNodes.findIndex(x => x === uidRelatedLocus) == -1) &&
                    (node.contemporaries.findIndex(x => x === uidRelatedLocus) == -1)) {
                    if (relations.findIndex(r => r.uid_locus === uidRelatedLocus) == -1) {
                        console.log(`api2HmNodes: relation ${node.name} and ${apiRecord.related_arch_context} is missing a reverse relation.`);
                        droppedRelations.push({ locusRelation: apiRecord, reason: ERR_MISSING_REVERSE });
                    } else {
                        if (chronType === LATER) {
                            node.earlierNodes.push(uidRelatedLocus);
                        } else {
                            node.contemporaries.push(uidRelatedLocus);
                        }
                    }
                } else {
                    console.log(`api2HmNodes: found another chronological relevant relation between ${node.name} and ${apiRecord.related_arch_context}: ${apiRecord.relation_type}`);
                    droppedRelations.push({ locusRelation: apiRecord, reason: ERR_MULTIPLE });
                }

            } else {
                if (chronType === "") {
                    droppedRelations.push({
                        locusRelation: apiRecord,
                        reason: ERR_NON_TEMPORAL_RELATION,
                    });
                } else {
                    console.log(`node ${node.id}/${node.name} has chron type EARLIER`)

                }
            }
        }
    }
    return nodes.values();
}

export function debugApi2HmNodes(relations: Array<LocusRelation>, loci: Array<Locus>, droppedRelations: Array<DroppedRelation>) {
    const nodes: Map<string, hmNode> = new Map();

    function uid2name(uid: string) {
        return loci.find(l => l.uid === uid).arch_context;
    }

    //todo:
    //amendMissingLocusRelations(relations)

    for (const apiRecord of relations) {
        const locusUID = apiRecord.arch_context;
        let chronType = getChronType(apiRecord.chronology, apiRecord.relation_type);
        let node = nodes.get(locusUID);
        if (!node) {
            node = new hmNode(locusUID, [], []);
            node.name = apiRecord.arch_context;
            const locus = loci.find((locus) => locus.uid === apiRecord.uid_locus);
            node.data = locus;
            node.locusType = locus.type;
            node.tags = [];
            if (locus.tags) {
                node.tags = locus.tags.split("#");
            }
            nodes.set(locusUID, node);
        }

        if (chronType === LATER || chronType === SAME) {
            const uidRelatedLocus: string = apiRecord.uid_locus_related;
            if ((node.earlierNodes.findIndex(x => x === uidRelatedLocus) == -1) &&
                (node.contemporaries.findIndex(x => x === uidRelatedLocus) == -1)) {
                if (chronType === LATER) {
                    node.earlierNodes.push(uid2name(uidRelatedLocus));
                } else {
                    node.contemporaries.push(uid2name(uidRelatedLocus));
                }
            } else {
                console.log(`api2HmNodes: found another chronological relevant relation between ${node.name} and ${apiRecord.related_arch_context}: ${apiRecord.relation_type}`);
                droppedRelations.push({ locusRelation: apiRecord, reason: ERR_MULTIPLE });
            }

        } else {
            if (chronType === "") droppedRelations.push({
                locusRelation: apiRecord,
                reason: ERR_NON_TEMPORAL_RELATION,
            });
        }
    }
    return nodes.values();
}