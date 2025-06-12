/**
 * @file 动物育种近交系数计算模块
 * @description 该模块根据扁平化的动物谱系数据，计算指定个体之间配对后，其假想后代的近交系数。
 *              它能正确处理复杂的亲缘关系和多代近交情况。
 * @version 1.1.0
 */

/**
 * @class Animal
 * @description 代表谱系网络中的一个节点（即一个动物个体）。
 */
class Animal {
    /**
     * @param {string|number} id - 动物的唯一标识符。
     * @param {Animal|null} parent1 - 母亲（parent1）的Animal对象实例。
     * @param {Animal|null} parent2 - 父亲（parent2）的Animal对象实例。
     */
    constructor(id, parent1 = null, parent2 = null) {
        if (id === null || id === undefined || String(id).trim() === '' || String(id).toLowerCase() === 'undefined' || String(id).toLowerCase() === 'null') {
            throw new Error(`无效的动物 ID: '${id}'。`);
        }
        this.id = String(id).trim();
        this.parent1 = parent1;
        this.parent2 = parent2;
    }
    getId() { return this.id; }
    getParent1() { return this.parent1; }
    getParent2() { return this.parent2; }
    setParent1(parent1) { this.parent1 = parent1; }
    setParent2(parent2) { this.parent2 = parent2; }

    /**
     * 获取此动物的所有祖先（不包括自身）。
     * @returns {Set<Animal>} 包含所有祖先Animal对象的集合。
     */
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
 * @description 封装了近交系数计算的核心算法。采用路径系数法，并使用多级缓存以优化性能。
 */
class RelatednessCalculator {
    constructor() {
        this.inbreedingCache = new Map();         // 缓存每个个体的近交系数 (F)
        this.offspringInbreedingCache = new Map(); // 缓存特定配对后代的近交系数
        this.pathCache = new Map();                // 缓存个体间的血缘路径
        this.currentlyCalculatingF = new Set();    // 用于检测和防止递归死循环
    }

    /**
     * 计算并返回指定个体的近交系数 (F)。
     * @param {Animal} animal - 需要计算近交系数的动物对象。
     * @returns {number} 该动物的近交系数。
     */
    calculateInbreeding(animal) {
        if (!animal) return 0.0;
        const id = animal.getId();
        if (this.inbreedingCache.has(id)) return this.inbreedingCache.get(id);
        if (this.currentlyCalculatingF.has(id)) { return 0.0; } // 发现递归环路，按规则返回0

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
     * 计算两个亲本（parent1, parent2）的假想后代的近交系数。
     * @param {Animal} parent1 - 亲本一。
     * @param {Animal} parent2 - 亲本二。
     * @returns {number} 假想后代的近交系数。
     */
    calculateOffspringInbreeding(parent1, parent2) {
        if (!parent1 || !parent2) return 0.0;

        let p1 = parent1; let p2 = parent2;
        // 保证缓存键的顺序一致性
        if (p1.getId().localeCompare(p2.getId()) > 0) { [p1, p2] = [p2, p1]; }
        const cacheKey = `${p1.getId()},${p2.getId()}`;
        if (this.offspringInbreedingCache.has(cacheKey)) return this.offspringInbreedingCache.get(cacheKey);

        const ancestors1 = p1.getAncestors(); ancestors1.add(p1);
        const ancestors2 = p2.getAncestors(); ancestors2.add(p2);

        const commonAncestors = new Set();
        for (const ancestor of ancestors1) { if (ancestors2.has(ancestor)) { commonAncestors.add(ancestor); } }

        let totalF = 0.0;
        for (const ancestor of commonAncestors) {
            const fAncestor = this.calculateInbreeding(ancestor);
            const paths1 = this._findPathsToAncestorWithCache(p1, ancestor);
            const paths2 = this._findPathsToAncestorWithCache(p2, ancestor);

            for (const path1 of paths1) {
                for (const path2 of paths2) {
                    const n1 = path1.length - 1;
                    const n2 = path2.length - 1;
                    const exponent = n1 + n2 + 1;
                    // 应用Wright路径系数公式: F_x = Σ[(0.5)^(n1+n2+1) * (1+F_A)]
                    const contribution = Math.pow(0.5, exponent) * (1.0 + fAncestor);
                    totalF += contribution;
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

/**
 * @class BreedingPlanner
 * @description 育种规划器，负责解析谱系数据、构建动物对象网络，并协调计算流程。
 */
class BreedingPlanner {
    constructor() {
        this.animalMap = new Map();
    }

    /**
     * 根据ID获取或创建一个Animal对象实例。
     * 在单次计算中，此方法确保每个ID只对应一个唯一的Animal对象。
     * @param {string|number|null} id - 动物的ID。
     * @returns {Animal|null} 对应的Animal对象，如果ID无效则返回null。
     */
    getOrCreateAnimal(id) {
        if (id === null || id === undefined || String(id).trim() === '') { return null; }
        const trimmedId = String(id).trim();
        if (!this.animalMap.has(trimmedId)) {
            this.animalMap.set(trimmedId, new Animal(trimmedId));
        }
        return this.animalMap.get(trimmedId);
    }

    /**
     * 从JSON对象数组中加载谱系数据，并在内存中构建起完整的、相互关联的动物对象网络。
     * @param {object[]} jsonDataArray - 包含一个或多个谱系记录的数组。
     */
    loadPedigreeFromJson(jsonDataArray) {
        for (const record of jsonDataArray) {
            // 兼容驼峰命名 'sId' 和全小写 'sid' 作为动物自身ID。
            const mainAnimalId = record.sId || record.sid;
            const mainAnimal = this.getOrCreateAnimal(mainAnimalId);
            if (!mainAnimal) continue;

            const relationships = {
                [mainAnimalId]: { mother: record.mId, father: record.fId },
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

                // 仅当父/母为空时才设置，避免覆盖由其他记录建立的更完整的关系
                if (childAnimal.getParent1() === null && mother) { childAnimal.setParent1(mother); }
                if (childAnimal.getParent2() === null && father) { childAnimal.setParent2(father); }
            }
        }
    }
}

/**
 * 模块的主入口函数。计算单个母牛与一个或多个公牛配对后，所有假想后代的近交系数。
 * @param {object} cowRecord - 目标母牛的谱系记录对象。必须包含 'sId' 或 'sid' 字段。
 * @param {object[]} bullRecordsArray - 包含一个或多个公牛的谱系记录的数组。每个对象都应包含 'sId' 或 'sid' 字段。为了保证谱系完整性，此数组应包含所有待配对公牛的相关亲属记录。
 * @returns {object[]} 返回一个结果数组。每个元素是一个对象，格式为 { bullId: string, cowId: string, inbreedingCoefficient: number }。
 * @example
 * const { calculateBreedingInbreeding } = require('./breedingCalculator.js');
 * const cow = { sId: 'cow1', mId: 'common_mother' };
 * const bulls = [{ sId: 'bull1', mId: 'common_mother' }];
 * const results = calculateBreedingInbreeding(cow, bulls);
 * // results -> [{ bullId: 'bull1', cowId: 'cow1', inbreedingCoefficient: 0.25 }]
 */
function calculateBreedingInbreeding(cowRecord, bullRecordsArray) {
    if (!cowRecord || !(cowRecord.sId || cowRecord.sid) || !bullRecordsArray || bullRecordsArray.length === 0) {
        console.error("输入数据无效。请提供有效的母牛记录对象和公牛记录数组。");
        return [];
    }

    const primaryCowId = cowRecord.sId || cowRecord.sid;
    const results = [];
    const planner = new BreedingPlanner();
    const calculator = new RelatednessCalculator();

    // 将所有相关的谱系记录合并，一次性构建完整的谱系网络
    const allPedigreeRecords = [cowRecord, ...bullRecordsArray];
    planner.loadPedigreeFromJson(allPedigreeRecords);

    // 遍历所有待配对的公牛
    for (const primaryBullRecord of bullRecordsArray) {
        const primaryBullId = primaryBullRecord.sId || primaryBullRecord.sid;
        if (!primaryBullId) continue; // 跳过没有自身ID的公牛记录

        const cowAnimal = planner.getOrCreateAnimal(primaryCowId);
        const bullAnimal = planner.getOrCreateAnimal(primaryBullId);

        if (!cowAnimal || !bullAnimal) {
            console.warn(`无法为配对 ${primaryBullId} 和 ${primaryCowId} 找到有效的动物对象，跳过此配对。`);
            continue;
        }

        const inbreedingCoefficient = calculator.calculateOffspringInbreeding(bullAnimal, cowAnimal);

        // 按要求格式组装结果
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