/**
 * @file 动物育种近交系数计算模块 (无缓存版)
 * @description 该模块根据扁平化的动物谱系数据，计算指定个体之间配对后，其假想后代的近交系数。
 *              此版本不包含任何性能缓存，确保每次计算的独立性，适用于在单次执行中处理不同谱系假设的场景。
 * @version 3.0.1 (No-Cache Edition, Patched)
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

        const visited = new Set();
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

/**
 * @class PathNode
 * @description 在DFS寻路算法中，用于存储路径信息的辅助类。
 */
class PathNode {
    constructor(animal, path) { this.animal = animal; this.path = path; }
}

/**
 * @class RelatednessCalculator
 * @description 封装了近交系数计算的核心算法。此版本无性能缓存。
 */
class RelatednessCalculator {
    constructor() {
        this.currentlyCalculatingF = new Set();
    }

    calculateInbreeding(animal) {
        if (!animal) return 0.0;
        const id = animal.getId();
        if (this.currentlyCalculatingF.has(id)) { return 0.0; }

        this.currentlyCalculatingF.add(id);
        const parent1 = animal.getParent1();
        const parent2 = animal.getParent2();
        let inbreedingCoefficient = 0.0;
        if (parent1 && parent2) {
            inbreedingCoefficient = this.calculateOffspringInbreeding(parent1, parent2);
        }
        this.currentlyCalculatingF.delete(id);
        return inbreedingCoefficient;
    }

    calculateOffspringInbreeding(parent1, parent2) {
        if (!parent1 || !parent2) return 0.0;

        const ancestors1 = parent1.getAncestors(); ancestors1.add(parent1);
        // --- 此处已被修正 ---
        const ancestors2 = parent2.getAncestors(); ancestors2.add(parent2);

        const commonAncestors = new Set();
        for (const ancestor of ancestors1) { if (ancestors2.has(ancestor)) { commonAncestors.add(ancestor); } }

        let totalF = 0.0;
        for (const ancestor of commonAncestors) {
            const fAncestor = this.calculateInbreeding(ancestor);
            const paths1 = this._findPathsToAncestor(parent1, ancestor);
            const paths2 = this._findPathsToAncestor(parent2, ancestor);

            for (const path1 of paths1) {
                for (const path2 of paths2) {
                    const n1 = path1.length - 1;
                    const n2 = path2.length - 1;
                    const exponent = n1 + n2 + 1;
                    const contribution = Math.pow(0.5, exponent) * (1.0 + fAncestor);
                    totalF += contribution;
                }
            }
        }
        return totalF;
    }

    _findPathsToAncestor(start, target) {
        if (!start || !target) return [];
        return this._findPathsToAncestorDFS(start, target);
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

/**
 * @class BreedingPlanner
 * @description 育种规划器，负责解析谱系数据、构建动物对象网络。
 */
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
        // 先创建所有出现过的动物实例，确保对象唯一性
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
        for (const id of allIds) { this.getOrCreateAnimal(id); }

        // 建立关系
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
                
                // 允许覆盖，以处理谱系假设变更
                if (mother) childAnimal.setParent1(mother);
                if (father) childAnimal.setParent2(father);
            }
        }
    }
}

/**
 * 模块的主入口函数。
 */
function calculateBreedingInbreeding(cowRecord, bullRecordsArray) {
    if (!cowRecord || !(cowRecord.sId || cowRecord.sid) || !bullRecordsArray || bullRecordsArray.length === 0) {
        console.error("输入数据无效。请提供有效的母牛记录对象和公牛记录数组。");
        return [];
    }

    const primaryCowId = cowRecord.sId || cowRecord.sid;
    const results = [];
    
    for (const primaryBullRecord of bullRecordsArray) {
        const planner = new BreedingPlanner();
        const calculator = new RelatednessCalculator();

        const primaryBullId = primaryBullRecord.sId || primaryBullRecord.sid;
        if (!primaryBullId) continue;

        const currentPedigreeSet = [cowRecord, primaryBullRecord];
        planner.loadPedigreeFromJson(currentPedigreeSet);
        
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