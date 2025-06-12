/**
 * @file 动物育种近交系数计算模块
 * @description 该模块根据扁平化的动物谱系数据，计算指定个体之间配对后，其假想后代的近交系数。
 *              它能正确处理复杂的亲缘关系和多代近交情况，并实现了路径独立性检查以保证算法的准确性。
 * @version 1.3.0
 */

/**
 * @class Animal
 * @description 代表谱系网络中的一个节点（即一个动物个体）。
 */
class Animal {
    constructor(id, parent1 = null, parent2 = null) {
        if (id === null || id === undefined || String(id).trim() === '' || String(id).toLowerCase() === 'undefined' || String(id).toLowerCase() === 'null') {
            throw new Error(`无效的动物 ID: '${id}'。`);
        }
        this.id = String(id).trim();
        this.parent1 = parent1; // Mother
        this.parent2 = parent2; // Father
    }
    getId() { return this.id; }
    getParent1() { return this.parent1; }
    getParent2() { return this.parent2; }
    setParent1(parent1) { this.parent1 = parent1; }
    setParent2(parent2) { this.parent2 = parent2; }

    getAncestors() {
        const ancestors = new Set();
        const queue = [];
        if (this.parent1) queue.push(this.parent1);
        if (this.parent2) queue.push(this.parent2);

        const visited = new Set([this.id]);
        if (this.parent1) visited.add(this.parent1.id);
        if (this.parent2) visited.add(this.parent2.id);

        while (queue.length > 0) {
            const current = queue.shift();
            ancestors.add(current);

            const p1 = current.getParent1();
            if (p1 && !visited.has(p1.id)) { queue.push(p1); visited.add(p1.id); }
            const p2 = current.getParent2();
            if (p2 && !visited.has(p2.id)) { queue.push(p2); visited.add(p2.id); }
        }
        return ancestors;
    }
    toString() { return this.id; }
    equals(other) {
        if (this === other) return true;
        if (other === null || !other || this.constructor !== other.constructor) return false;
        return this.id === other.id;
    }
}

class PathNode {
    constructor(animal, path) { this.animal = animal; this.path = path; }
}

class RelatednessCalculator {
    constructor() {
        this.inbreedingCache = new Map();
        this.offspringInbreedingCache = new Map();
        this.pathCache = new Map();
        this.currentlyCalculatingF = new Set();
    }

    calculateInbreeding(animal) {
        if (!animal) return 0.0;
        const id = animal.getId();
        if (this.inbreedingCache.has(id)) return this.inbreedingCache.get(id);
        if (this.currentlyCalculatingF.has(id)) { return 0.0; }

        this.currentlyCalculatingF.add(id);
        const parent1 = animal.getParent1();
        const parent2 = animal.getParent2();
        let inbreedingCoefficient = 0.0;
        if (parent1 && parent2) {
            inbreedingCoefficient = this.calculateOffspringInbreeding(parent1, parent2);
        }
        this.inbreedingCache.set(id, inbreedingCoefficient);
        this.currentlyCalculatingF.delete(id);
        return inbreedingCoefficient;
    }

    /**
     * @private
     * 检查两条到共同祖先的路径是否独立（除了终点外没有共同节点）。
     * 这是Wright路径系数法的关键规则，以避免重复计算。
     * @param {Animal[]} path1 - 第一条路径。
     * @param {Animal[]} path2 - 第二条路径。
     * @returns {boolean} 如果路径独立则返回 true。
     */
    _arePathsIndependent(path1, path2) {
        const midNodes1 = path1.slice(1, -1);
        if (midNodes1.length === 0) return true; 

        const midNodesSet1 = new Set(midNodes1.map(a => a.getId()));
        const midNodes2 = path2.slice(1, -1);

        for (const node of midNodes2) {
            if (midNodesSet1.has(node.getId())) {
                return false;
            }
        }
        return true;
    }

    calculateOffspringInbreeding(parent1, parent2) {
        if (!parent1 || !parent2) return 0.0;

        let p1 = parent1; let p2 = parent2;
        if (p1.getId().localeCompare(p2.getId()) > 0) { [p1, p2] = [p2, p1]; }
        const cacheKey = `${p1.getId()},${p2.getId()}`;
        if (this.offspringInbreedingCache.has(cacheKey)) return this.offspringInbreedingCache.get(cacheKey);

        const ancestors1 = p1.getAncestors(); ancestors1.add(p1);
        const ancestors2 = p2.getAncestors(); ancestors2.add(p2);
        
        const commonAncestors = new Set();
        for (const ancestor of ancestors1) {
            if (ancestors2.has(ancestor)) { commonAncestors.add(ancestor); }
        }

        if (commonAncestors.size === 0) {
            this.offspringInbreedingCache.set(cacheKey, 0.0);
            return 0.0;
        }

        let totalF = 0.0;
        for (const ancestor of commonAncestors) {
            const fAncestor = this.calculateInbreeding(ancestor);
            const paths1 = this._findPathsToAncestorWithCache(p1, ancestor);
            const paths2 = this._findPathsToAncestorWithCache(p2, ancestor);

            for (const path1 of paths1) {
                for (const path2 of paths2) {
                    if (this._arePathsIndependent(path1, path2)) {
                        const n1 = path1.length - 1;
                        const n2 = path2.length - 1;
                        const exponent = n1 + n2 + 1;
                        const contribution = Math.pow(0.5, exponent) * (1.0 + fAncestor);
                        totalF += contribution;
                    }
                }
            }
        }
        this.offspringInbreedingCache.set(cacheKey, totalF);
        return totalF;
    }

    _findPathsToAncestorWithCache(start, target) {
        if (!start || !target) return [];
        const pathKey = `${start.getId()}->${target.getId()}`;
        if (this.pathCache.has(pathKey)) return this.pathCache.get(pathKey);
        const paths = this._findPathsToAncestorDFS(start, target);
        this.pathCache.set(pathKey, paths); return paths;
    }

    _findPathsToAncestorDFS(start, target) {
        const paths = []; if (start.equals(target)) { paths.push([start]); return paths; }
        const stack = [new PathNode(start, [start])];
        while (stack.length > 0) {
            const { animal: currentAnimal, path: currentPathToAnimal } = stack.pop();
            const parent1 = currentAnimal.getParent1(); if (parent1) this._processParentForDFS(parent1, target, currentPathToAnimal, paths, stack);
            const parent2 = currentAnimal.getParent2(); if (parent2) this._processParentForDFS(parent2, target, currentPathToAnimal, paths, stack);
        }
        return paths;
    }

    _processParentForDFS(parent, target, currentPath, allPaths, stack) {
        if (parent.equals(target)) { allPaths.push([...currentPath, parent]); }
        else if (!currentPath.some(animalInPath => animalInPath.equals(parent))) { stack.push(new PathNode(parent, [...currentPath, parent])); }
    }
}

class BreedingPlanner {
    constructor() {
        this.animalMap = new Map();
    }

    getOrCreateAnimal(id) {
        if (id === null || id === undefined || String(id).trim() === '') { return null; }
        const trimmedId = String(id).trim();
        if (!this.animalMap.has(trimmedId)) {
            this.animalMap.set(trimmedId, new Animal(trimmedId));
        }
        return this.animalMap.get(trimmedId);
    }

    loadPedigreeFromJson(jsonDataArray) {
        const allIds = new Set();
        const idFields = ['sId', 'sid', 'mId', 'fId', 'mmId', 'mfId', 'fmId', 'ffId', 'mmmId', 'mmfId', 'mfmId', 'mffId', 'fmmId', 'fmfId', 'ffmId', 'fffId'];

        for (const record of jsonDataArray) {
            for (const field of idFields) {
                if (record[field]) {
                    const trimmedId = String(record[field]).trim();
                    if(trimmedId) allIds.add(trimmedId);
                }
            }
        }
        for (const id of allIds) {
            this.getOrCreateAnimal(id);
        }

        for (const record of jsonDataArray) {
            const relationships = {
                [record.sId || record.sid]: { mother: record.mId, father: record.fId },
                [record.fId]: { mother: record.fmId, father: record.ffId },
                [record.mId]: { mother: record.mmId, father: record.mfId },
                [record.ffId]: { mother: record.ffmId, father: record.fffId },
                [record.fmId]: { mother: record.fmmId, father: record.fmfId },
                [record.mfId]: { mother: record.mfmId, father: record.mffId },
                [record.mmId]: { mother: record.mmmId, father: record.mmfId }
            };

            for (const childId in relationships) {
                const childAnimal = this.getOrCreateAnimal(childId);
                if (!childAnimal) continue;

                const { mother: motherId, father: fatherId } = relationships[childId];
                const mother = this.getOrCreateAnimal(motherId);
                const father = this.getOrCreateAnimal(fatherId);
                
                if (childAnimal.getParent1() === null && mother) { childAnimal.setParent1(mother); }
                if (childAnimal.getParent2() === null && father) { childAnimal.setParent2(father); }
            }
        }
    }
}

function calculateBreedingInbreeding(cowRecord, bullRecordsArray) {
    if (!cowRecord || !(cowRecord.sId || cowRecord.sid) || !Array.isArray(bullRecordsArray) || bullRecordsArray.length === 0) {
        console.error("输入数据无效。请提供有效的母牛记录对象和非空的公牛记录数组。");
        return [];
    }

    const primaryCowId = cowRecord.sId || cowRecord.sid;
    const results = [];
    const planner = new BreedingPlanner();
    const calculator = new RelatednessCalculator();

    const allPedigreeRecords = [cowRecord, ...bullRecordsArray];
    planner.loadPedigreeFromJson(allPedigreeRecords);

    for (const primaryBullRecord of bullRecordsArray) {
        const primaryBullId = primaryBullRecord.sId || primaryBullRecord.sid;
        if (!primaryBullId) continue;

        const cowAnimal = planner.getOrCreateAnimal(primaryCowId);
        const bullAnimal = planner.getOrCreateAnimal(primaryBullId);

        if (!cowAnimal || !bullAnimal) {
            console.warn(`无法为配对 ${primaryBullId} 和 ${primaryCowId} 找到有效的动物对象，跳过此配对。`);
            continue;
        }

        const inbreedingCoefficient = calculator.calculateOffspringInbreeding(bullAnimal, cowAnimal);

        results.push({
            bullId: String(bullAnimal.getId()),
            cowId: String(cowAnimal.getId()),
            inbreedingCoefficient: parseFloat(inbreedingCoefficient.toFixed(8))
        });
    }

    return results;
}

// 导出模块的公共API
module.exports = {
    calculateBreedingInbreeding
};