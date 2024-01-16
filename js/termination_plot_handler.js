import { BaseVisulizationHandler } from "./base_handler.js";

export class TerminationVizHandler extends BaseVisulizationHandler {

    static FIELDS = {
        whiteElo: "WhiteElo",
        blackElo: "BlackElo",
        avgElo: "AvgElo",
        termination: "Termination"
    };

    static KEYS = [
        "Checkmate",
        "Draw",
        "Resignation",
        "Time forfeit",
    ];

    constructor() {
        super();
        this._data;

        this._options.plotWidth = 700;
        this._options.plotHeight = 500;
        this._options.plotMargin = {
            top: 10,
            right: 20,
            bottom: this._options.plotWidth * 0.15,
            left: this._options.plotHeight * 0.15,
        };

        this._options.colors = {
            background: "grey",
            checkmate: "green",
            draw: "blue",
            resignation: "yellow",
            timeout: "red",
        };

        this._options.bracketSize = 100;
        this._options.minCount = 150;
    }

    _initializeData() {
        const addAvgElo = (d) => {
            d[TerminationVizHandler.FIELDS.avgElo] = (d[TerminationVizHandler.FIELDS.whiteElo] + d[TerminationVizHandler.FIELDS.blackElo]) / 2;
        }

        this._data = this._dataHandler.getAllWithFields(
            TerminationVizHandler.FIELDS.whiteElo,
            TerminationVizHandler.FIELDS.blackElo,
            TerminationVizHandler.FIELDS.termination
        );
        this._data.forEach(addAvgElo);

        var totalValues = d3.rollup(
            this._data,
            D => D.length,
            d => {
                var eloBracket = Math.floor(d[TerminationVizHandler.FIELDS.avgElo] / this._options.bracketSize) * this._options.bracketSize;
                return eloBracket;
            }
        );

        this._data = d3.flatRollup(
            this._data,
            D => {
                var d = D[0];
                var eloBracket = Math.floor(d[TerminationVizHandler.FIELDS.avgElo] / this._options.bracketSize) * this._options.bracketSize;
                return D.length / totalValues.get(eloBracket)
            },
            d => d[TerminationVizHandler.FIELDS.termination],
            d => {
                var eloBracket = Math.floor(d[TerminationVizHandler.FIELDS.avgElo] / this._options.bracketSize) * this._options.bracketSize;
                return eloBracket;
            }
        );

        this._data = d3.map(
            this._data,
            ([termination, eloBracket, percent]) => { return { termination, eloBracket, percent } }
        ).filter(({ termination, eloBracket, percent }) => totalValues.get(eloBracket) >= this._options.minCount);

        var combinations = d3.group(
            this._data,
            d => d.eloBracket,
            d => d.termination
        );

        [...combinations.keys()].forEach(eloBracket => {
            TerminationVizHandler.KEYS.forEach(termination => {
                if (!combinations.get(eloBracket).has(termination)) {
                    this._data.push({
                        termination,
                        eloBracket,
                        percent: 0
                    })
                }
            });
        });
    }

    _buildPlot() {
        // domain bounds
        var [minX, maxX] = d3.reduce(
            this._data,
            (acc, d) => {
                acc[0] = Math.min(acc[0], d.eloBracket);
                acc[1] = Math.max(acc[1], d.eloBracket);
                return acc;
            },
            [Infinity, 0]
        );

        // scales
        this._xScale = this._createXScale([minX, maxX]);
        this._yScale = this._createYScale([0, 1]);
        this._colorScale = d3.scaleOrdinal()
            .domain(TerminationVizHandler.KEYS)
            .range([
                this._options.colors.checkmate,
                this._options.colors.draw,
                this._options.colors.resignation,
                this._options.colors.timeout
            ]);

        // background
        this._createBackground();

        // grid
        this._createYGrid(minX, maxX, 5);

        // lines and dots
        this._lines = this._plot.append("g")
        this._circles = this._plot.append("g")

        // tooltip
        this._tooltip = this._createTooltip();

        // axes
        this._createXAxis(this._xScale, 20);
        this._createYAxis(this._yScale, 10, d => d * 100 + "%");

        // labels
        this._createXAxisLabel(`Elo (intervalos de ${this._options.bracketSize})`);
        this._createYAxisLabelRotated("Porcentaje de juegos");

        // legend
        var legendBuilder = d3.legendColor()
            .scale(this._colorScale)
            .shape("path", d3.symbol().type(d3.symbolSquare).size(200)())
            .shapePadding(30)
            .on("cellclick", this._cellclick);
        this._legend = this._content.append("g")
            .attr("transform", "translate(" + (this._getEffectivePlotWitdh() + 10) + ", " + (this._getEffectivePlotHeight() * 0.3) + ")");
        this._legend.call(legendBuilder);
    }

    updatePlot() {
        // lines
        var groupedData = d3.group(this._data, d => d.termination);

        this._lines.selectAll("path")
            .data(groupedData)
            .join("path")
            .attr("d", ([termination, d]) => d3.line()
                .x(d => this._xScale(d.eloBracket))
                .y(d => this._yScale(d.percent))
                (d3.sort(d, d => d.eloBracket))
            )
            .attr("stroke", ([termination, d]) => this._colorScale(termination))
            .attr("fill", "none")
            .attr("stroke-width", 1.5);

        // dots
        var circleGroups = this._circles.selectAll()
            .data(this._data)
            .join("g");

        circleGroups.append("circle")
            .attr("class", "innerCircle")
            .attr("cx", d => this._xScale(d.eloBracket))
            .attr("cy", d => this._yScale(d.percent))
            .attr("r", 4)
            .attr("fill", d => this._colorScale(d.termination))
            .attr("fill-opacity", "0");

        circleGroups.append("circle")
            .attr("class", "outterCircle")
            .attr("cx", d => this._xScale(d.eloBracket))
            .attr("cy", d => this._yScale(d.percent))
            .attr("r", 15)
            .attr("fill", "#fff0")
            .on('mouseover', this._mouseover)
            .on('mousemove', this._mouseover)
            .on('mouseout', this._mouseout);
    }

    // mouse events
    _mouseover = (evt, d) => {
        var outterCircle = evt.target;
        var innerCircle = d3.select(outterCircle.parentNode).select(".innerCircle");
        var text = d.percent;

        innerCircle.transition()
            .duration(50)
            .attr("fill-opacity", "1");

        this._displayTooltip(this._tooltip, text, evt);
    }

    _mouseout = (evt, d) => {
        var outterCircle = evt.target;
        var innerCircle = d3.select(outterCircle.parentNode).select(".innerCircle");

        innerCircle.transition()
            .duration(50)
            .attr("fill-opacity", "0");

        this._hideTooltip(this._tooltip);
    }

    _cellclick = (evt) => {
        var termination = d3.select(evt.target).data()[0];
        if (this._selectedTermination == termination) {
            this._selectedTermination = undefined;
        } else {
            this._selectedTermination = termination;
        }

        var isSelected = (termination) => !this._selectedTermination || this._selectedTermination == termination;

        // legend
        this._legend.selectAll("path")
            .transition()
            .duration(50)
            .style("fill", termination => isSelected(termination) ? this._colorScale(termination) : "grey");

        // lines
        this._lines.selectAll("path")
            .transition()
            .duration(50)
            .attr("opacity", ([termination, d]) => isSelected(termination) ? 1 : 0.5)
            .attr("stroke", ([termination, d]) => isSelected(termination) ? this._colorScale(termination) : "grey");

        // dots
        this._circles.selectAll("g")
            .attr("pointer-events", ({ termination }) => isSelected(termination) ? "all" : "none");
    }

}