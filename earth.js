(function ($) {
    "use strict";

    function Helper() {

    }

    function Universe(config) {
        var self = this;

        self.G = config.G;

        self.decorate();
    }

    Universe.prototype.getRandomInt = function(min, max) {
        return Math.floor(Math.random() * max ) + 1;
    };

    Universe.prototype.decorate = function() {
        var self = this,
            numberOfUniverses = 14,
            universeImageElement = $('.universe-image'),
            universeId = self.getRandomInt(0, numberOfUniverses),
            imagePath = 'images/universe/' + universeId + '.jpg',
            image;

        var newImg = new Image();

        $('body').css('background-image', 'url("' + imagePath + '")');

        newImg.onload = function() {
            var height = newImg.height;
            var width = newImg.width;

            universeImageElement.css('margin', '-' + (height / 2) + 'px 0 0 -' + (width / 2) + 'px');
            universeImageElement.attr('src', imagePath);
        };

        newImg.src = imagePath;
    };

    Universe.prototype.toDegrees = function(angle) {
        return angle * (180 / Math.PI);
    };

    function Playground(config) {
        var self = this;

        self.universe = config.universe;
        self.element = $('#' + config.htmlId);

        self.width = config.width;
        self.height = config.height;
        self.blockSize = config.blockSize;
        self.blockClass = config.blockClass;
        self.gameplayElements = config.gameplayElements;

        self.columnCount = Math.floor(self.width / self.blockSize);
        self.rowCount = Math.floor(self.height / self.blockSize);
        self.surcafeRowNumber = Math.floor(self.rowCount * config.surfacePart);

        self.gravityArrowPrototype = $('#' + config.gravityArrowPrototypeClass);
        self.deviationElements = {
            x: $('.' + config.gameplayElements.deviationXClass),
            y: $('.' + config.gameplayElements.deviationYClass),
            sum: $('.' + config.gameplayElements.deviationSumClass)
        };

        self.blocks = [];
        self.allocatedBlocks = {
            null: {},
            ground: {},
            surface: {}
        };
        self.gravity = {
            result: {},
            blocks: {}
        };
        self.gravityArrows = {};
        self.deviation = {};
    }

    Playground.prototype.init = function () {
        var self = this;

        self._setSpace();
    };

    Playground.prototype._setSpace = function () {
        var self = this;

        for (var y = 0; y < self.columnCount; y++) {
            for (var x = 0; x < self.columnCount; x++) {
                var block = new Block(self, x, y, null, self.blockClass);
                self._addBlock(block);
            }
        }
    };

    Playground.prototype.getSpace = function () {
        return this.blocks;
    };



    Playground.prototype._addBlock = function (block) {
        var self = this;

        if (typeof self.blocks[block.getX()] === 'undefined') {
            self.blocks[block.getX()] = [];
        }

        self.blocks[block.getX()][block.getY()] = block;
        self._allocateBlock(block);
        self.element.append(block.getElement());

        //var arrow = self.gravityArrowPrototype.clone().removeClass('arrow-prototype').hide();
    };


    Playground.prototype.setBlockType = function (block, type) {
        var self = this;

        if (block.getType() === type) {
            return;
        }

        self._detachBlock(block);
        block.setType(type);
        self._allocateBlock(block);
    };

    Playground.prototype._allocateBlock = function (block) {
        var self = this;

        if (typeof self.allocatedBlocks[block.getType()][block.getId()] === 'undefined') {
            self.allocatedBlocks[block.getType()][block.getId()] = block;
        }
    };

    Playground.prototype._detachBlock = function (block) {
        var self = this;

        if (typeof self.allocatedBlocks[block.getType()][block.getId()] !== 'undefined') {
            delete self.allocatedBlocks[block.getType()][block.getId()];
        }
    };

    Playground.prototype.setWorld = function (world) {
        var self = this;

        self.word = world;

        self._setSurface();
        self._setGround();
    };

    Playground.prototype._setSurface = function () {
        var self = this,
            block,
            x;

        self.surfaceBlockCount = Math.floor(self.word.getWidth() / self.blockSize);
        self.surfaceXStartColumn = Math.floor((self.columnCount - self.surfaceBlockCount) / 2);
        self.surfaceXEndColumn = self.surfaceXStartColumn + self.surfaceBlockCount;

        for (x = self.surfaceXStartColumn; x < self.surfaceXEndColumn; x++) {
            block = self.blocks[x][self.surcafeRowNumber];
            self.setBlockType(block, 'surface');
            self.decorateSurface(block);

            self.gravityArrows[block.getId()] = self.gravityArrowPrototype.clone()
                .removeAttr('id')
                .css({
                    top: block.getCoordinates().center.y + 'px',
                    left: block.getCoordinates().center.x + 'px'
                })
                .appendTo(self.element)
            ;
        }
    };

    Playground.prototype.decorateSurface = function (block) {
        var self = this,
            imagePath = 'images/surface/s' + self.universe.getRandomInt(0, 4) + '.png';

        block.getElement().css({
            'background-image': 'url("' + imagePath + '")'
        });
    };

    Playground.prototype._setGround = function () {
        var self = this,
            block,
            x,
            y;

        self.groundBlockCount = Math.floor(self.word.getGroundWidth() / self.blockSize);
        self.groundXStartColumn = Math.floor((self.columnCount - self.groundBlockCount) / 2);
        self.groundXEndColumn = self.groundXStartColumn + self.groundBlockCount;

        self.groundHeightBlockCount = Math.floor(self.word.getGroundHeight() / self.blockSize);
        self.groundYStartColumn = self.surcafeRowNumber + 1;
        self.groundYEndColumn = self.groundYStartColumn + self.groundHeightBlockCount;

        for (y = self.groundYStartColumn; y < self.groundYEndColumn; y++) {
            for (x = self.groundXStartColumn; x < self.groundXEndColumn; x++) {
                block = self.blocks[x][y];
                self.setBlockType(block, 'ground');
            }
        }
    };

    Playground.prototype.calculateGravity = function () {
        var self = this,
            surfaceBlock,
            groundBlock,
            i,
            j;

        for (i in self.allocatedBlocks['surface']) {
            if (!self.allocatedBlocks['surface'].hasOwnProperty(i)) {
                continue;
            }

            surfaceBlock = self.allocatedBlocks['surface'][i];

            for (j in self.allocatedBlocks['ground']) {
                if (!self.allocatedBlocks['ground'].hasOwnProperty(j)) {
                    continue;
                }

                groundBlock = self.allocatedBlocks['ground'][j];

                self._considerGravity(surfaceBlock, groundBlock);
            }

            self._summarizeGravity(surfaceBlock);
        }
    };

    Playground.prototype.recalculateDeviation = function () {
        var self = this,
            id,
            sumY = 0,
            n = 0,
            blockResult,
            Dx = 0,
            Dy = 0,
            avY;

        for (id in self.gravity.result) {
            if (!self.gravity.result.hasOwnProperty(id)) {
                continue;
            }

            blockResult = self.gravity.result[id];

            sumY += blockResult.gY;
            n++;
        }

        avY = sumY / n;

        // console.log(avY);

        for (id in self.gravity.result) {
            if (!self.gravity.result.hasOwnProperty(id)) {
                continue;
            }

            blockResult = self.gravity.result[id];

            Dx += Math.pow(blockResult.gX, 2);
            Dy += Math.pow(blockResult.gY - avY, 2);
        }

        self.deviation = {
            x: Math.sqrt(Dx),
            y: Math.sqrt(Dy)
        };

        // console.log(self.deviation);

        return self.deviation
    };


    Playground.prototype.showDeviation = function (deviation) {
        var self = this;

        // console.log(deviation);

        self.deviationElements.x.html(new String(deviation.x).substr(0, 6));
        self.deviationElements.y.html(new String(deviation.y).substr(0, 6));
        self.deviationElements.sum.html(new String(deviation.x + deviation.y).substr(0, 6));
    };

    Playground.prototype.recalculateGravity = function (block) {
        var self = this,
            surfaceBlock,
            i;

        for (i in self.allocatedBlocks['surface']) {
            if (!self.allocatedBlocks['surface'].hasOwnProperty(i)) {
                continue;
            }

            surfaceBlock = self.allocatedBlocks['surface'][i];

            self._considerGravity(surfaceBlock, block);
            self._summarizeGravity(surfaceBlock);
        }
    };

    Playground.prototype._considerGravity = function (block, attractor) {
        var self = this;

        if (attractor.getType() === null) {
            delete self.gravity.blocks[block.getId()][attractor.getId()];
        } else {
            if (!self.gravity.blocks.hasOwnProperty(block.getId())) {
                self.gravity.blocks[block.getId()] = {};
            }
            self.gravity.blocks[block.getId()][attractor.getId()] = self._measureGravity(block, attractor);
        }
    };

    Playground.prototype._measureGravity = function (block, attractor) {
        var self = this,
            a,
            b,
            r2,
            r,
            g,
            gX,
            gY;

        a = attractor.getX() - block.getX();
        b = attractor.getY() - block.getY();

        r2 = Math.pow(a, 2) + Math.pow(b, 2);
        r = Math.sqrt(r2);

        g = block.playground.universe.G * attractor.getMass() / r2;

        gX = g * a / r;
        gY = g * b / r;

        return {
            gX: gX,
            gY: gY
        }
    };

    Playground.prototype._summarizeGravity = function (surfaceBlock) {
        var self = this,
            block,
            sumGX = 0,
            sumGY = 0,
            sumG,
            id;

        for (id in self.gravity.blocks[surfaceBlock.getId()]) {
            if (!self.gravity.blocks[surfaceBlock.getId()].hasOwnProperty(id)) {
                continue;
            }

            block = self.gravity.blocks[surfaceBlock.getId()][id];

            sumGX += block.gX;
            sumGY += block.gY;
        }

        sumG = Math.sqrt(Math.pow(sumGX, 2) + Math.pow(sumGY, 2));

        self.gravity.result[surfaceBlock.getId()] = {
            g: sumG,
            gX: sumGX,
            gY: sumGY
        };
    };

    Playground.prototype.showGravityArrows = function() {
        var self = this,
            id;

        for (id in self.allocatedBlocks['surface']) {
            if (!self.allocatedBlocks['surface'].hasOwnProperty(id)) {
                continue;
            }

            self.setGravityArrow(self.allocatedBlocks['surface'][id])
        }

        for (id in self.allocatedBlocks['surface']) {
            if (!self.allocatedBlocks['surface'].hasOwnProperty(id)) {
                continue;
            }

            self.showGravityArrow(self.allocatedBlocks['surface'][id])
        }
    };

    Playground.prototype.setGravityArrow = function(block) {
        var self = this,
            gravity,
            height,
            angle;

        gravity = self.gravity.result[block.getId()];
        height = gravity.g * 120;

        if (gravity.gY >= 0) {
            angle = Math.asin((-1) * gravity.gX / gravity.g);
        } else {
            if (gravity.gX < 0) {
                angle = Math.PI + Math.asin(gravity.gX / gravity.g);
            } else {
                angle = Math.asin(gravity.gX / gravity.g) - Math.PI;
            }
        }

        // if (block.getId() === '6-6' || block.getId() === '13-6') {
            // console.log(gravity.gX +  '/' + gravity.g + ' => ' + block.getId()+  ': '+ self.universe.toDegrees(angle))
        // }

        self.gravityArrows[block.getId()].css({
            height: height,
            transform: 'rotate(' + angle + 'rad)'
        });
    };

    Playground.prototype.showGravityArrow = function(block) {
        var self = this;

        self.gravityArrows[block.getId()].show();
    };

    function Block(playground, x, y, type, htmlClass) {
        var self = this;

        self.mass = 1;

        self.playground = playground;
        self.x = x;
        self.y = y;
        self.id = self.x + '-' + self.y;
        self.type = type;
        self.htmlClass = htmlClass;

        self.element = $('<div data-x="' + this.x + '" data-y="' + this.y + '" class="' + this.htmlClass + '"></div>');

        self.coordinates = self._calculateCoordinates();

        self.element.on('click', function () {
            self.toggle();
        })
    }

    Block.prototype.toggle = function () {
        var self = this;

        function getTransmissionType(block) {
            var transmissions = {
                ground: null,
                null: 'ground'
            };

            return transmissions[block.getType()];
        }

        if (typeof getTransmissionType(self) !== 'undefined') {
            self.playground.setBlockType(self, getTransmissionType(self));
        }

        self.playground.recalculateGravity(self);
        self.playground.showGravityArrows();
        // console.log(self.playground.gravity.result['6-6']);
        // console.log(self.playground.gravity.result['13-6']);
        var deviation = self.playground.recalculateDeviation();

        self.playground.showDeviation(deviation);
    };


    Block.prototype.getType = function () {
        return this.type;
    };

    Block.prototype.getCoordinates = function () {
        return this.coordinates;
    };

    Block.prototype._calculateCoordinates = function () {
        var self = this;

        return {
            center: {
                x: (self.x + 0.5) * self.playground.blockSize,
                y: (self.y + 0.5) * self.playground.blockSize
            }
        };
    };

    Block.prototype.setType = function (type) {
        var self = this;

        if (self.type !== type) {
            if (self.type !== null) {
                self.element.removeClass('block-' + self.type);
            }

            self.type = type;

            if (self.type !== null) {
                self.element.addClass('block-' + self.type);
            }
        }
    };

    Block.prototype.getId = function () {
        return this.id;
    };

    Block.prototype.getMass = function () {
        return this.mass;
    };

    Block.prototype.getX = function () {
        return this.x;
    };

    Block.prototype.getY = function () {
        return this.y;
    };

    Block.prototype.getElement = function () {
        return this.element;
    };

    function World (config) {
        var self = this;

        self.width = config.width;
        self.groundWidth = config.groundWidth;
        self.groundHeight = config.groundHeight;
    }

    World.prototype.getWidth = function () {
        return this.width;
    };

    World.prototype.getGroundWidth = function () {
        return this.groundWidth;
    };

    World.prototype.getGroundHeight = function () {
        return this.groundHeight;
    };

    function God(config) {
        var self = this;

        self.playground = config.playground;
        self.groundShape = {};
        self.worksapce = {};
    }

    God.prototype.buildPerfection = function () {
        var self = this;


        self.determineGroundShape();
        self.defineWorkplace();

        // console.log(self.worksapce);
    };

    God.prototype.determineGroundShape = function () {
        var self = this,
            groundBlock,
            id,
            x,
            space;

        // for (id in self.playground.allocatedBlocks['ground']) {
        //     if (!self.playground.allocatedBlocks['ground'].hasOwnProperty(id)) {
        //         continue;
        //     }
        //
        //     groundBlock = self.playground.allocatedBlocks['ground'][id];
        //
        //     if (!self.groundShape.hasOwnProperty(groundBlock.getX())) {
        //         self.groundShape[groundBlock.getX()] = [];
        //     }
        //
        //     self.groundShape[groundBlock.getX()].push(groundBlock.getY())
        // }

        // space = self.playground.getSpace();

        // for (x in space) {
        //     if (!space.hasOwnProperty(x)) {
        //         continue;
        //     }
        //
        //
        // }

        // for (x in self.groundShape) {
        //     if (!self.groundShape.hasOwnProperty(x)) {
        //         continue;
        //     }
        //
        //     self.groundShape[x].sort(function (a, b) {
        //         return a - b;
        //     });
        // }

        // console.log(self.playground);
        // console.log(self.groundShape);
    };

    God.prototype.defineWorkplace = function () {
        var self = this,
            space,
            x,
            y,
            minY = 0,
            maxY = 0;

        space = self.playground.getSpace();
        maxY = self.playground.getSpace()[0].length + 1;
        minY = maxY;

        for (x in space) {
            if (!space.hasOwnProperty(x)) {
                continue;
            }

            for (y in space[x]) {
                if (!space[x].hasOwnProperty(y)) {
                    continue;
                }

                if (space[x][y].getType() === 'surface') {
                    if (minY > y) {
                        minY = y;
                    }
                }
            }
        }

        minY = parseInt(minY);

        // console.log(self.playground);

        self.worksapce = {
            x: {
                min: 0,
                max: self.playground.getSpace().length
            },
            y: {
                min: minY + 1,
                max: maxY
            }
        };

        self.worksapce.x.middle = (self.worksapce.x.max - self.worksapce.x.min) / 2;
        self.worksapce.info = {};

        return self.worksapce;
    };


    God.prototype.findBestBlockToAdd = function () {
        var self = this;

        //for ()

        //self
    };




    // MODAL
    $(document).ready(function () {

        var universe = new Universe({
            G: 1
        });

        var playground = new Playground({
            universe: universe,
            htmlId: 'playground',
            width: 1000,
            height: 1000,
            blockSize: 25,
            blockClass: 'block',
            gravityArrowPrototypeClass: 'arrow-prototype',
            surfacePart: 0.50,
            gameplayElements: {
                scoreClass: 'score',
                deviationXClass: 'deviation-x',
                deviationYClass: 'deviation-y',
                deviationSumClass: 'deviation-sum'
            }
        });

        var world = new World({
            width: 500,
            groundWidth: 500,
            groundHeight: 25
        });

        playground.init();

        playground.setWorld(world);
        playground.calculateGravity();
        playground.showGravityArrows();

        var god = new God({
            playground: playground
        });

        god.buildPerfection();
    });


})(jQuery);