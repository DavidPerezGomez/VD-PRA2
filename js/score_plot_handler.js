import { BaseVisulizationHandler } from "./base_handler.js";

export class ScoreVizHandler extends BaseVisulizationHandler {

    static FIELDS = {
        whiteElo: "WhiteElo",
        blackElo: "BlackElo",
        eloDiff: "EloDiff",
        score: "Score"
    };

    constructor() {
        super();
        this._data;

        this._options.plotWidth = 700
        this._options.plotHeight = 500
        this._options.plotMargin.top = 10;
        this._options.plotMargin.right = 20;
        this._options.plotMargin.bottom = this._options.plotWidth * 0.15;
        this._options.plotMargin.left = this._options.plotHeight * 0.15;

        this._options.colors = {
            background: "grey",
            dots: "black",
            line: "blue",
        };

        this._options.bracketSize = 10;
    }

    _initializeData() {
        this._data = this._dataHandler.getAllWithFields(
            ScoreVizHandler.FIELDS.whiteElo,
            ScoreVizHandler.FIELDS.blackElo,
            ScoreVizHandler.FIELDS.score,
        );

        this._data = d3.flatRollup(
            this._data,
            D => D.reduce((acc, d) => acc + d[ScoreVizHandler.FIELDS.score], 0) / D.length,
            d => {
                var eloDiff = d[ScoreVizHandler.FIELDS.whiteElo] - d[ScoreVizHandler.FIELDS.blackElo];
                var eloDiffBracket = Math.floor(eloDiff / this._options.bracketSize) * this._options.bracketSize;
                return eloDiffBracket;
            }
        );
    }

    _buildPlot() {
        // domain bounds
        var [minX, maxX] = d3.reduce(
            this._data,
            (acc, [eloDiffBracket, score]) => {
                acc[0] = Math.min(acc[0], eloDiffBracket);
                acc[1] = Math.max(acc[1], eloDiffBracket);
                return acc;
            },
            [Infinity, -Infinity]
        );
        this._xValues = Array(Math.floor(maxX) - Math.ceil(minX) + 1)
            .fill(Math.ceil(minX))
            .map((x, i) => x + i);

        // scales
        this._xScale = this._createXScale([minX, maxX]);
        this._yScale = this._createYScale([0, 1]);

        // background
        this._createBackground();

        // grid
        this._createXGrid(0, 1, 1);
        this._createYGrid(minX, maxX, 3);

        // curve and dots
        this._curve = this._plot.append("g");
        this._dots = this._plot.append("g");

        // axes
        this._createXAxis(this._xScale);
        this._createYAxis(this._yScale);

        // labels
        this._createXAxisLabel("Diferencia en Elo (Blancas - Negras)", 35);
        this._createYAxisLabelRotated("Puntuación", 35);
    }

    updatePlot() {
        // curve
        this._curve.selectAll("path")
            .data([this._xValues])
            .join("path")
            .attr("d", d => d3.line()
                .x(d => this._xScale(d))
                .y(d => this._yScale(this._eloScoreDiffInverse(d)))
                (d)
            )
            .attr("stroke", this._options.colors.line)
            .attr("fill", "none")
            // .attr("opacity", 0.75)
            .attr("stroke-width", 3);

        // dots
        this._dots.selectAll("circle")
            .data(this._data)
            .join("circle")
            .attr("cx", d => this._xScale(d[0]))
            .attr("cy", d => this._yScale(d[1]))
            .attr("r", 2)
            .attr("fill", this._options.colors.dots);
    }

    _eloScore(eloA, eloB) {
        var rBA = eloB - eloA;
        return this._eloScoreDiff(rBA);
    }

    _eloScoreDiff(rBA) {
        var s = 400;
        var score = (1 / (1 + 10 ** (rBA / s)));

        return score;
    }

    _eloScoreDiffInverse(rAB) {
        return this._eloScoreDiff(-rAB);
    }
}