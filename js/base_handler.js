export class BaseVisulizationHandler {

    constructor() {
        this._plotElement;
        this._svg;
        this._plot;

        this._options = {
            plotHeight: 400,
            plotWidth: 400,
            plotMargin: {
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
            },
        };
    }

    options(options) {
        Object.getOwnPropertyNames(this._options)
            .forEach(p => p in options ? this._options[p] = options[p] : null);
        return this;
    }

    dataHandler(dataHandler) {
        this._dataHandler = dataHandler;
        return this;
    }

    plot(plotElementId) {
        this._plotElement = $(`#${plotElementId}`)[0];
        return this;
    }

    initializePlot() {
        this._initializePlot()
        this._initializeData()
        this._buildPlot()
        this._drawPlot()
        return this;
    }

    updatePlot() {
        // override
    }

    _initializePlot() {
        this._svg = d3.create("svg")
            .attr("width", this._options.plotWidth)
            .attr("height", this._options.plotHeight)
            .attr("style", "height: auto;");

        this._content = this._svg.append("g")
            .attr("transform", "translate(" + this._options.plotMargin.left + "," + this._options.plotMargin.top + ")");

        this._plot = this._content.append("svg").attr("width", this._getEffectivePlotWitdh())
            .attr("height", this._getEffectivePlotHeight());
    }

    _initializeData() {
        // override
    }

    _buildPlot() {
        // override
    }

    _drawPlot() {
        this._plotElement.append(this._svg.node());
    }

    _getEffectivePlotHeight() {
        return this._options.plotHeight - this._options.plotMargin.top - this._options.plotMargin.bottom;
    }

    _getEffectivePlotWitdh() {
        return this._options.plotWidth - this._options.plotMargin.left - this._options.plotMargin.right;;
    }

    _createBackground(color = this._options.colors.background) {
        return this._plot.append("rect")
            .attr("width", this._getEffectivePlotWitdh())
            .attr("height", this._getEffectivePlotHeight())
            .attr("fill", color);
    }

    _createXScale(domain, range = null, type = { name: "linear" }) {
        if (!range) {
            range = [0, this._getEffectivePlotWitdh()];
        }

        return this._createScale(domain, range, type);
    }

    _createYScale(domain, range = null, type = { name: "linear" }) {
        if (!range) {
            range = [this._getEffectivePlotHeight(), 0];
        }

        return this._createScale(domain, range, type);
    }

    _createScale(domain, range, type) {
        var scale;
        switch (type.name) {
            case "linear":
                scale = d3.scaleLinear();
                break;
            case "sqrt":
                scale = d3.scaleSqrt();
                break;
            case "pow":
                scale = d3.scalePow().exponent(type.value);
                break;
            case "log":
                scale = d3.scaleLog().base(type.value);
                break;
        }

        return scale.domain(domain)
            .range(range);
    }

    _createXGrid(minY, maxY, ticks) {
        this._plot.append("g")
            .selectAll("line")
            .data(this._xScale.ticks(ticks))
            .join("line")
            .attr("x1", d => this._xScale(d))
            .attr("x2", d => this._xScale(d))
            .attr("y1", this._yScale(minY))
            .attr("y2", this._yScale(maxY))
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", "1px")
            .attr("opacity", "0.25")
            .attr("shape-rendering", "crispEdges");
    }

    _createYGrid(minX, maxX, ticks) {
        this._plot.append("g")
            .selectAll("line")
            .data(this._yScale.ticks(ticks))
            .join("line")
            .attr("x1", this._xScale(minX))
            .attr("x2", this._xScale(maxX))
            .attr("y1", d => this._yScale(d))
            .attr("y2", d => this._yScale(d))
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", "1px")
            .attr("opacity", "0.25")
            .attr("shape-rendering", "crispEdges");
    }

    _createXAxis(xScale, ticks = 10, tickFormat = (d) => d) {
        return this._content.append("g")
            .attr("transform", "translate(0," + this._getEffectivePlotHeight() + ")")
            .call(
                d3.axisBottom(xScale)
                    .ticks(ticks)
                    .tickFormat(tickFormat)
            );
    }

    _createYAxis(yScale, ticks = 10, tickFormat = (d) => d) {
        return this._content.append("g")
            .call(
                d3.axisLeft(yScale)
                    .ticks(ticks)
                    .tickFormat(tickFormat)
            );
    }

    _createXAxisLabel(text, bottomPadding = this._options.plotMargin.bottom / 2) {
        return this._content.append("text")
            .attr("text-anchor", "middle")
            .attr("x", this._getEffectivePlotWitdh() / 2)
            .attr("y", this._getEffectivePlotHeight() + bottomPadding)
            .attr("class", "xLabel")
            .text(text);
    }

    _createYAxisLabelRotated(text, leftPadding = this._options.plotMargin.left / 2) {
        return this._content.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -this._getEffectivePlotHeight() / 2)
            .attr("y", -leftPadding)
            .attr("class", "yLabel")
            .text(text);
    }

    _createTooltip() {
        return d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("z-index", "10")
            .style("visibility", "hidden")
    }

    _displayTooltip(tooltip, text, pos) {
        tooltip.html(text)
            .style("left", (pos.pageX + 10) + "px")
            .style("top", (pos.pageY - 15) + "px")
            .transition()
            .duration(50)
            .style("visibility", "visible");
    }

    _hideTooltip(tooltip) {
        tooltip.transition()
            .duration(50)
            .style("visibility", "hidden");
    }
}