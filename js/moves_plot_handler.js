import { BaseVisulizationHandler } from "./base_handler.js";

export class MovesVizHandler extends BaseVisulizationHandler {

    static FIELDS = {
        whiteElo: "WhiteElo",
        blackElo: "BlackElo",
        avgElo: "AvgElo",
        nMoves: "NumberMoves"
    };

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
            dots: "black",
            line: "blue",
        };
    }

    _initializeData() {
        const addAvgElo = (d) => {
            d[MovesVizHandler.FIELDS.avgElo] = (d[MovesVizHandler.FIELDS.whiteElo] + d[MovesVizHandler.FIELDS.blackElo]) / 2;
        }

        this._data = this._dataHandler.getAllWithFields(
            MovesVizHandler.FIELDS.whiteElo,
            MovesVizHandler.FIELDS.blackElo,
            MovesVizHandler.FIELDS.nMoves
        );
        this._data.forEach(addAvgElo);

        this._sampleData = this._dataHandler.getSampleWithFields(
            Math.min(this._data.length, 50000),
            MovesVizHandler.FIELDS.whiteElo,
            MovesVizHandler.FIELDS.blackElo,
            MovesVizHandler.FIELDS.nMoves
        );
        this._sampleData.forEach(addAvgElo);

        var { a, b } = this._linearRegression(
            this._data.map(d => d[MovesVizHandler.FIELDS.avgElo]),
            this._data.map(d => d[MovesVizHandler.FIELDS.nMoves]),
        );

        this._lm = x => a + b * x;
    }

    _buildPlot() {
        // domain bounds
        var [minX, maxX, maxY] = this._data.reduce((acc, d) => {
            acc[0] = Math.min(acc[0], d[MovesVizHandler.FIELDS.avgElo]);
            acc[1] = Math.max(acc[1], d[MovesVizHandler.FIELDS.avgElo]);
            acc[2] = Math.max(acc[2], d[MovesVizHandler.FIELDS.nMoves]);
            return acc;
        }, [Infinity, 0, 0]);

        this._xValues = [...Array(Math.floor(maxX)).keys()].slice(Math.ceil(minX));

        // scales
        this._xScale = this._createXScale([minX, maxX]);
        this._yScale = this._createYScale([0, maxY]);

        // background
        this._createBackground();

        // dots and line
        this._dots = this._plot.append("g");
        this._line = this._plot.append("g");

        // axes
        this._createXAxis(this._xScale);
        this._createYAxis(this._yScale);

        // labels
        this._createXAxisLabel("Elo");
        this._createYAxisLabelRotated("Nº movimientos");
    }

    updatePlot() {
        // dots
        this._dots.selectAll("circle")
            .data(this._sampleData)
            .join("circle")
            .attr("cx", d => this._xScale(d[MovesVizHandler.FIELDS.avgElo]))
            .attr("cy", d => this._yScale(d[MovesVizHandler.FIELDS.nMoves]))
            .attr("r", 2)
            .attr("fill", this._options.colors.dots)
            .attr("fill-opacity", "0.2");

        // line
        this._line.selectAll("path")
            .data([this._xValues])
            .join("path")
            .attr("d", d => d3.line()
                .x(d => this._xScale(d))
                .y(d => this._yScale(this._lm(d)))
                (d)
            )
            .attr("stroke", this._options.colors.line)
            .attr("fill", "none")
            .attr("stroke-width", 2.5);
    }

    _linearRegression(x, y) {
        var meanX = x.reduce((acc, xi) => acc + xi, 0) / x.length;
        var meanY = y.reduce((acc, yi) => acc + yi, 0) / y.length;

        var varianceX = x.reduce((acc, xi) => acc + (xi - meanX) ** 2, 0) / (x.length - 1);
        var covarianceXY = x.reduce((acc, xi, i) => acc + (xi - meanX) * (y[i] - meanY), 0) / (x.length - 1);

        // y = a + bx
        var b = covarianceXY / varianceX;
        var a = meanY - b * meanX;

        return { a, b };
    }
}