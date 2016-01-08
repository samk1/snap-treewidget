/**
 * Created by Samuel on 1/01/2016.
 */



function TreeNode(name) {

    var children = [
        'child1',
        'child2',
        'child3',
        'child4',
        'child5'
    ];

    var m = Math.floor(Math.random() * 5);

    function getChildNodes () {
        var childNodes = [];

        children.forEach((c, i) => i < m && childNodes.push(new TreeNode(c)));

        return childNodes;
    }

    function getName () {
        return name
    }

    function isLeaf() {
        return m === 0;
    }

    return {
        getChildNodes,
        getName,
        isLeaf
    }
}

// HACK HACK HACK
function getSvgBBox(svg) {
    var parent = svg.parent();
    var tempGroup = parent.g();
    tempGroup.append(svg);
    var svgBBox = tempGroup.getBBox();
    svg.appendTo(parent);
    tempGroup.remove();

    return svgBBox;
}



function treeNodePlugin (rootNode) {
    var attr = {
        leftMargin: 10,
        topMargin: 10,
        fontSize: 32,
        branchLength: 10,
        branchColor: '#000',
        branchWidth: 1,
        branchDasharray: '2, 3',
        bgColor: '#eee',
        animDuration: 250
    };

    var paper = this.svg(attr.leftMargin);

    var chevronSvg = (function createChevron() {
        var chevronPathStr = "M1107 659l-742 -742q-19 -19 -45 -19t-45 19l-166 166q-19 19 -19 45t19 45l531 531l-531 531q-19 19 -19 45t19 45l166 166q19 19 45 19t45 -19l742 -742q19 -19 19 -45t-19 -45z";
        var chevronSvg = paper.svg().toDefs();
        var chevronPath = chevronSvg.path(chevronPathStr);
        chevronPath.attr({
            transform: Snap.matrix().translate(0, 2).scale(0.0125)
        });

        var chevronSvgBBox = chevronSvg.getBBox();

        chevronSvg.data('height', chevronSvgBBox.height);
        chevronSvg.data('width', chevronSvgBBox.width);
        return chevronSvg;
    })();

    var rootGroup, bottomNode;

    var stemId = 0;
    var nodeId = 0;
    var chevronId = 0;

    function getStemId() {
        return `stem_${stemId++}`;
    }

    function getNodeId() {
        return `node_${nodeId++}`;
    }

    function getChevronId() {
        return `chevron_${nodeId++}`;
    }

    function drawNode(node, x, y) {
        var nodeGroup  = paper.group();
        nodeGroup.data('leftOffset', x);
        nodeGroup.data('topOffset', y);
        nodeGroup.data('bottomOffset', y + attr.topMargin + attr.fontSize);

        var nodePaper = paper.svg(x, y);

        nodeGroup.append(nodePaper);
        nodeGroup.attr({id: getNodeId()});

        var offsetX = 0;

        var expandBtnHeight = attr.fontSize;
        var expandBtnWidth = attr.fontSize;
        var lineHeight = attr.fontSize;
        var midY  = lineHeight / 2;

        nodePaper.line(
            offsetX,
            midY,
            offsetX + attr.branchLength,
            midY
        ).attr({
            stroke: attr.branchColor,
            strokeWidth: attr.branchWidth,
            strokeDasharray: attr.branchDasharray
        });

        offsetX += attr.branchLength;

        var expandBtn = nodePaper.rect(
            offsetX,
            0,
            expandBtnHeight,
            expandBtnWidth
        ).attr({
            fill: attr.bgColor,
            opacity: 0
        });

        if(!node.isLeaf()) {
            var chevronId = getChevronId();
            var chevron = nodePaper.use(chevronSvg).attr({
                x: offsetX + (lineHeight / 2) - (chevronSvg.data('width') / 2),
                y: (lineHeight / 2) - (chevronSvg.data('height') / 2),
                id: chevronId
            }).insertBefore(expandBtn);

            chevron.data('centerX', offsetX + lineHeight / 2);
            chevron.data('centerY', lineHeight / 2);
            nodeGroup.data('chevronId', chevronId);
            expandBtn.click(makeClickFn(node, nodeGroup));
        } else {
            nodePaper.circle(
                offsetX + lineHeight / 2 , lineHeight/2, lineHeight/4
            );
        }

        offsetX += expandBtnWidth + attr.leftMargin;

        nodePaper.text(
            offsetX,
            lineHeight,
            node.getName()
        ).attr({
            fontSize: attr.fontSize,
            fontFamily: 'sans-serif'
        });

        return nodeGroup;
    }

    function drawChildNodes(childNodes, afterElm, x, y) {
        x = x || 0;
        y = y || 0;
        var offsetX = x;
        var offsetY = y;
        var level = afterElm.data('level') + 1 || 0;
        var childGroup = paper.group();
        var lastChild;

        childNodes.forEach(function (n) {
            childGroup.append(drawNode(n, offsetX, offsetY).data('level', level));
            offsetY += attr.fontSize + attr.topMargin;
        });
        childGroup.insertAfter(afterElm);

        childGroup.data('leftOffset', x);
        childGroup.data('topOffset', y);
        childGroup.data('bottomOffset', offsetY);
        childGroup.data('height', offsetY - y);

        lastChild = Snap(childGroup.node.lastChild);
        lastChild.data('last', true);

        if(level === 0) {
            bottomNode = lastChild;
        }

        return childGroup;
    }

    function drawStem(nodeGroup, childGroup) {
        var stemId = getStemId();
        var leftOffset = childGroup.data('leftOffset');
        var topOffset = childGroup.data('topOffset');
        var bottomOffset = childGroup.data('bottomOffset');

        Array.from(childGroup.node.childNodes).forEach(
            n => Snap(n).data('stemId', stemId)
        );

        var stemTop = topOffset - (2 * attr.topMargin);
        var stemBottom = bottomOffset - (2.5 * attr.topMargin);
        var stem = paper.line(
            leftOffset, stemTop,
            leftOffset, stemBottom
        );
        stem.attr({
            strokeWidth: attr.branchWidth,
            stroke: attr.branchColor,
            id: stemId,
            strokeDasharray: attr.branchDasharray
        });
        stem.data('nodeId', nodeGroup.node.id);
        stem.data('stemBottom', stemBottom);
        stem.data('level', nodeGroup.data('level') + 1);
        childGroup.prepend(stem);

        return stem;
    }

    function makeClickFn(node, nodeGroup) {
        var expanded = false;
        var expand = makeExpandFn(node, nodeGroup);
        var shrink = makeShrinkFn(node, nodeGroup);

        return function (e) {
            if (!expanded) {
                expand(e);
            } else {
                shrink(e);
            }

            expanded = !expanded;
        }
    }

    function collectElmsAfter(elm) {
        var col = [];
        var next = elm.node.nextSibling;

        while (next) {
            col.push(Snap(next));
            next = next.nextSibling
        }

        return col;
    }

    function animateChevronDown(nodeGroup) {
        var chevron = Snap(`#${nodeGroup.data('chevronId')}`);
        chevron.animate({
            transform: Snap.matrix().rotate(90, chevron.data('centerX'), chevron.data('centerY'))
        }, attr.animDuration, mina.easeinout);
    }

    function animateExpand(childGroup) {
        var height = childGroup.data('height');
        var topOffset = childGroup.data('topOffset');

        var finalMaskY = topOffset - (2 *attr.topMargin);
        var maskRect = paper.rect(
            0, height + finalMaskY,
            5000, 0
        ).attr({
            fill: '#fff'
        });

        var childMask = paper.mask();
        childMask.append(maskRect);

        childGroup.attr({
            transform: Snap.matrix().translate(0, -(height + attr.topMargin)),
            mask: childMask
        });

        childGroup.animate({
            transform: Snap.matrix().translate(0, 0)
        }, attr.animDuration, mina.easeinout, function () {
            var prevElm = Snap(childGroup.node.previousSibling);
            var childElms = Array.from(childGroup.node.childNodes);
            childElms.reverse().forEach(e => prevElm.after(Snap(e)));
            childGroup.remove();
        });

        maskRect.animate({
            y: finalMaskY,
            height: height + attr.topMargin
        }, attr.animDuration, mina.easeinout, function () {
            childMask.remove();
        })
    }

    function animateShiftDown(childGroup) {
        var height = childGroup.data('height');
        var shiftHeight = height + attr.topMargin;
        var afterElms = collectElmsAfter(childGroup);

        var afterGroup = paper.group();
        afterElms.forEach(elm => afterGroup.add(elm));
        afterGroup.insertAfter(childGroup);
        afterGroup.data('shiftGroup', true);
        afterGroup.data('shiftHeight', shiftHeight);

        afterGroup.animate({
            transform: Snap.matrix().translate(0, shiftHeight)
        }, attr.animDuration, mina.easeinout);
    }

    function collectStems(nodeGroup) {
        var stems = [];
        var stem, last, stemId, node;

        stemId = nodeGroup.data('stemId');
        node = nodeGroup;

        while (stemId) {
            stem = Snap(`#${stemId}`);

            if(!node.data('last')) {
                stems.push(stem)
            }

            node = Snap(`#${stem.data('nodeId')}`);
            stemId = node.data('stemId');
        }

        return stems;
    }

    function animateStemExpand(nodeGroup, childGroup) {
        var height = childGroup.data('height');
        var stems = collectStems(nodeGroup);

        stems.forEach(function (stem) {
            var stemBottom = stem.data('stemBottom');
            var newStemBottom = stemBottom + height + attr.topMargin;

            stem.animate({
                y2: newStemBottom
            }, attr.animDuration, mina.easeinout, function () {
                stem.data('stemBottom', newStemBottom);
            });
        })
    }

    function makeExpandFn(node, nodeGroup) {
        return function expand(e) {
            var leftOffset = nodeGroup.data('leftOffset');
            var bottomOffset = nodeGroup.data('bottomOffset');

            var x = leftOffset + (attr.fontSize / 2) + attr.leftMargin;
            var y = bottomOffset + attr.topMargin;

            var childGroup = drawChildNodes(node.getChildNodes(), nodeGroup, x, y);

            drawStem(nodeGroup, childGroup);

            animateChevronDown(nodeGroup);
            animateStemExpand(nodeGroup, childGroup);
            animateShiftDown(childGroup);
            animateExpand(childGroup);
        }
    }

    function collectSubElms(nodeGroup) {
        var level = nodeGroup.data('level');
        var elm = Snap(nodeGroup.node.nextSibling);
        var curLevel = elm.data('level');
        var subElms = [];

        while (curLevel > level) {
            subElms.push(elm);
            elm = Snap(elm.node.nextSibling);

            while(elm.data('shiftGroup')) {
                elm = Snap(elm.node.firstChild);
            }

            curLevel = elm.data('level');
        }

        return subElms;
    }

    function countShifts(subElms) {
        var shifts = 0;
        var curLevel = 0;
        var nextLevel;

        subElms.forEach(function (elm) {
            nextLevel = elm.data('level');

            if (nextLevel > curLevel) {
                shifts++;
            }

            curLevel = nextLevel;
        });

        return shifts;
    }

    function computeShiftHeight(shifts) {
        var shiftCount = 0;
        var shiftHeight = 0;
        var shiftGroup = Snap(rootGroup.node.lastChild);

        while (shiftCount < shifts) {
            shiftHeight += shiftGroup.data('shiftHeight');
            shiftGroup = Snap(shiftGroup.node.lastChild);
            shiftCount++;
        }

        return shiftHeight;
    }

    function computeTotalShift() {
        var totalShift = 0;
        var shiftGroup = Snap(rootGroup.node.lastChild);

        while(shiftGroup.data('shiftGroup')) {
            totalShift += shiftGroup.data('shiftHeight');
            shiftGroup = Snap(shiftGroup.node.lastChild);
        }

        return totalShift;
    }

    function animateChevronRight(nodeGroup) {
        var chevron = Snap(`#${nodeGroup.data('chevronId')}`);
        chevron.animate({
            transform: Snap.matrix().rotate(0, chevron.data('centerX'), chevron.data('centerY'))
        }, attr.animDuration, mina.easeinout);
    }

    function animateStemShrink(nodeGroup, shiftHeight) {
        var stems = collectStems(nodeGroup);

        stems.forEach(function (stem) {
            var stemBottom = stem.data('stemBottom');
            var newStemBottom = stemBottom - shiftHeight;

            stem.animate({
                y2: newStemBottom
            }, attr.animDuration, mina.easeinout, function () {
                stem.data('stemBottom', newStemBottom);
            });
        })
    }

    function animateShiftUp(nodeGroup, subElms, shifts, shiftHeight) {
        var afterElms = collectElmsAfter(nodeGroup);
        var totalShift = computeTotalShift();
        var afterGroup = paper.group();
        var maskHeight = bottomNode.data('bottomOffset') + totalShift - nodeGroup.data('bottomOffset');
        afterGroup.insertAfter(nodeGroup);
        afterElms.forEach(e => afterGroup.add(e));

        var mask = paper.mask();
        var maskRect = paper.rect(
            0, nodeGroup.data('bottomOffset') - attr.topMargin,
            5000, maskHeight
        ).attr({
            fill: '#fff'
        });
        mask.append(maskRect);

        afterGroup.attr({
            mask: mask
        });


        maskRect.animate({
            y: nodeGroup.data('bottomOffset') + shiftHeight - attr.topMargin,
            height: maskHeight - shiftHeight
        }, attr.animDuration, mina.easeinout);


        afterGroup.animate({
            transform: Snap.matrix().translate(0, -shiftHeight)
        }, attr.animDuration, mina.easeinout, function () {
            subElms.forEach(e => e.remove());

            var shiftGroup = Snap(afterGroup.node.lastChild);
            (function removeShift (shifts, shiftGroup) {
                if (shifts === 0) return;
                var nextGroup = Snap(shiftGroup.node.lastChild);

                Array.from(shiftGroup.node.childNodes).reverse().forEach(
                    n =>  Snap(n).insertAfter(nodeGroup)
                );
                shiftGroup.remove();

                removeShift(shifts - 1, nextGroup);
            })(shifts, shiftGroup);

            afterGroup.remove();
            mask.remove();
        });
    }

    function makeShrinkFn(node, nodeGroup) {
        return function () {
            var subElms = collectSubElms(nodeGroup);
            var shifts = countShifts(subElms);
            var shiftHeight = computeShiftHeight(shifts);

            animateChevronRight(nodeGroup);
            animateStemShrink(nodeGroup, shiftHeight);
            animateShiftUp(nodeGroup, subElms, shifts, shiftHeight);
        }
    }

    var desc  = paper.el('desc');

    rootGroup = drawChildNodes(rootNode.getChildNodes(), desc);

}

Snap.plugin(function (Snap, Element, Paper) {
    Paper.prototype.treeNode = treeNodePlugin;
});
