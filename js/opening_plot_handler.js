import { BaseVisulizationHandler } from "./base_handler.js";

export class OpeningVizHandler extends BaseVisulizationHandler {

    static FIELDS = {
        whiteElo: "WhiteElo",
        blackElo: "BlackElo",
        score: "Score",
        opening: "ECO",
    };

    constructor() {
        super();
        this._data;
        this._eloSlider;

        this._options.plotWidth = 700;
        this._options.plotHeight = 500;
        this._options.plotMargin = {
            top: 10,
            right: 20,
            bottom: this._options.plotWidth * 0.15,
            left: this._options.plotHeight * 0.15,
        };

        this._options.colors = {
            background: "white",
            circles: "black",
            text: "white",
        };

        this._options.circleSizeRange = [10, 40];

        this._options.bracketSize = 100;
        this._options.minCount = 150;
    }

    slider(sliderElementId) {
        this._eloSlider = $(`#${sliderElementId}`);
        return this;
    }

    _initializeData() {
        this._data = this._dataHandler.getAllWithFields(
            OpeningVizHandler.FIELDS.whiteElo,
            OpeningVizHandler.FIELDS.blackElo,
            OpeningVizHandler.FIELDS.score,
            OpeningVizHandler.FIELDS.opening,
        );

        this._data = d3.rollup(
            this._data,
            D => {
                var summary = {};
                summary.count = D.length;
                summary.score = D.reduce((acc, d) => acc + d[OpeningVizHandler.FIELDS.score], 0) / D.length
                return summary;
            },
            d => {
                var avgElo = (d[OpeningVizHandler.FIELDS.whiteElo] + d[OpeningVizHandler.FIELDS.blackElo]) / 2;
                var eloBracket = Math.floor(avgElo / this._options.bracketSize) * this._options.bracketSize;
                return eloBracket;
            },
            d => d[OpeningVizHandler.FIELDS.opening][0]
        );

        this._data = new d3.InternMap(
            d3.sort(
                d3.map(this._data, ([key, eloBracket]) => {
                    eloBracket = d3.sort(eloBracket);

                    var total = d3.reduce(eloBracket, (acc, [key, opening]) => acc + opening.count, 0);

                    if (total < this._options.minCount) {
                        return null;
                    }

                    eloBracket.forEach(([key, opening]) => {
                        opening.percent = opening.count / total;
                    });

                    return [key, eloBracket];
                }).filter(x => x),
                ([key, eloBracket]) => Number(key)
            )
        );

        this._initializeSlider();
    }

    _getSelectedBracket() {
        return Number(this._eloSlider.val());
    }

    getSelectedBracketRange() {
        var eloBracket = this._getSelectedBracket();
        return `${eloBracket}-${eloBracket + this._options.bracketSize - 1}`;
    }

    _initializeSlider() {
        var minElo = Math.min(...this._data.keys());
        var maxElo = Math.max(...this._data.keys());

        this._eloSlider.attr("min", minElo);
        this._eloSlider.attr("max", maxElo);
        this._eloSlider.attr("step", this._options.bracketSize);
        this._eloSlider.val(Math.min(1400, maxElo));

        this._eloSlider.on("input", () => {
            this.updatePlot(this._getSelectedBracket())
        });
    }

    _buildPlot() {
        // domain bounds
        var [maxPercent, minCount, maxCount] = d3.reduce(
            this._data,
            (acc, [key, eloBracket]) => d3.reduce(
                eloBracket,
                (acc, [key, opening]) => {
                    acc[0] = Math.max(acc[0], opening.percent);
                    acc[1] = Math.min(acc[1], opening.count);
                    acc[2] = Math.max(acc[2], opening.count);
                    return acc;
                },
                acc
            ),
            [-Infinity, Infinity, -Infinity]
        );

        // scales
        this._xScale = this._createXScale([0, maxPercent]);
        // this._yScale = this._createYScale([0, 1]);
        this._yScale = d3.scaleLinear()
            .interpolate((a, b) => {
                return (t) => {
                    t = 2 * t - 1;
                    t = Math.sign(t) * Math.sqrt(Math.abs(t));
                    t = (t + 1) / 2;
                    return (a * (1 - t) + b * t);
                }
            })
            .domain([0, 1])
            .range([this._getEffectivePlotHeight(), 0]);
        this._sizeScale = d3.scaleLinear()
            .domain([minCount, maxCount])
            .range(this._options.circleSizeRange);

        // background
        this._createBackground();

        // grid
        this._createYGrid(0, maxPercent, 8);

        // circles and labels
        this._circles = this._plot.append("g");
        this._labels = this._plot.append("g");

        // axes
        this._xAxis = this._createXAxis(this._xScale, 10, d => d * 100 + "%");
        this._yAxis = this._createYAxis(this._yScale);

        // labels
        this._createXAxisLabel("Porcentaje de juegos", 35);
        this._createYAxisLabelRotated("Puntuación media", 35);

        // tooltip
        this._tooltip = this._createTooltip();
    }

    updatePlot(eloBracket = null) {
        if (!eloBracket) {
            eloBracket = this._getSelectedBracket();
        }

        var filteredData = this._data.get(eloBracket);

        var animationTime = 250;

        this._circles.selectAll("circle")
            .data(filteredData)
            .join(
                enter => enter.append("circle")
                    .attr("cx", d => this._xScale(d[1].percent))
                    .attr("cy", d => this._yScale(d[1].score))
                    // .attr("r", d => this._sizeScale(d[1].count))
                    .attr("r", d => this._sizeScale(d[1].count))
                    .attr("fill", this._options.colors.circles)
                    .attr("opacity", 0.5)
                    .on('mouseover', this._mouseover)
                    .on('mousemove', this._mouseover)
                    .on('mouseout', this._mouseout),

                update => update.transition()
                    .duration(animationTime)
                    .attr("cx", d => this._xScale(d[1].percent))
                    .attr("cy", d => this._yScale(d[1].score))
                    .attr("r", d => this._sizeScale(d[1].count))
            );

        this._labels.selectAll("text")
            .data(filteredData)
            .join(
                enter => enter.append("text")
                    .attr("x", d => this._xScale(d[1].percent))
                    .attr("y", d => this._yScale(d[1].score))
                    .attr("stroke", this._options.colors.text)
                    .attr("fill", this._options.colors.text)
                    .style("font-family", "'Lucida Console', 'Courier New', sans-serif")
                    .style("font-wight", "bold")
                    .attr("dominant-baseline", "middle")
                    .attr("text-anchor", "middle")
                    .attr("pointer-events", "none")
                    .text(d => d[0]),

                update => update.transition()
                    .duration(animationTime)
                    .attr("x", d => this._xScale(d[1].percent))
                    .attr("y", d => this._yScale(d[1].score))
                    .text(d => d[0])
            );
    }

    // mouse events
    _mouseover = (evt, [key, opening]) => {
        var circle = d3.select(evt.target);
        var text = `Porcentaje: ${(opening.percent * 100).toFixed(2)}%<br>Puntuación: ${opening.score.toFixed(2)}`;

        circle.transition()
            .duration(50)
            .attr("opacity", 0.9);

        this._displayTooltip(this._tooltip, text, evt);
    }

    _mouseout = (evt, [key, opening]) => {
        var circle = d3.select(evt.target);

        circle.transition()
            .duration(50)
            .attr("opacity", 0.5);

        this._hideTooltip(this._tooltip);
    }

}