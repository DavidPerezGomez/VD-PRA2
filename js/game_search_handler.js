import { BaseVisulizationHandler } from "./base_handler.js";

export class GameSearchVizHandler extends BaseVisulizationHandler {

    static FIELDS = {
        score: "Score"
    };

    static KEYS = [1, 0.5, 0];

    constructor() {
        super();
        this._data;
        this._chess = new Chess();
        this._boardElementId;

        this._options.plotWidth = 400;
        this._options.plotHeight = 100;

        this._options.colors = {
            white: "#ddd",
            black: "#222",
            draw: "#777",
        };

        this._options.highlights = {
            white: "#ccc",
            black: "#333",
            draw: "#888",
        };

        this._options.maxMoves = 8;
    }

    values(valuesElementId) {
        this._valuesElement = $(`#${valuesElementId}`)[0];
        return this;
    }

    board(boardElementId) {
        this._boardElementId = boardElementId;
        return this;
    }

    update(input) {
        // preprocess user input
        var cleanInput = this._cleanInput(input);

        // get FEN string for position
        try {
            this._chess.loadPgn(cleanInput);
            var fenPosition = this._chess.fen();
        } catch (error) {
            // TODO: display error
            console.log(error);
            return false;
        }

        // update board
        Chessboard(this._boardElementId, fenPosition);

        // find games
        this.updateData(this._getGamesByMoves(cleanInput));

        // update plot
        this.updatePlot();

        return true;
    }

    _cleanInput(input) {
        var cleanInput = input;

        // remove turn numbers (1. .. 2. ..)
        cleanInput = cleanInput.replace(/\d+\./g, "");

        // remove check and mate indicators (+, #)
        cleanInput = cleanInput.replace(/[\+#]/g, "");

        // trim spaces
        cleanInput = cleanInput.trim();

        // remove extra spaces
        cleanInput = cleanInput.replace(/\s{2,}/g, " ");

        // apply max moves
        cleanInput = cleanInput.split(" ");
        cleanInput = cleanInput.slice(0, this._options.maxMoves)
        cleanInput = cleanInput.join(" ");

        return cleanInput;
    }

    _getGamesByMoves(input) {
        var moveList;
        if (!input) {
            moveList = [];
        } else {
            moveList = input.split(" ");
        }
        return this._dataHandler.getGamesByMoves(moveList);
    }

    _initializePlot() {
        this._svg = d3.create("svg")
            .attr("width", this._options.plotWidth)
            .attr("height", this._options.plotHeight)
            .attr("viewBox", [0, 0, this._options.plotWidth, this._options.plotHeight])
            .attr("style", "max-width: 100%; height: auto;");

        this._plot = this._svg.append("g");

        Chessboard(this._boardElementId, "start");
    }

    _initializeData() {
        this.updateData(this._getGamesByMoves());
    }

    updateData(games) {
        this._data = games;

        this._data = d3.rollup(
            this._data,
            (D) => {
                return {
                    games: D.length,
                    percent: D.length / this._data.length
                }
            },
            (d) => d[GameSearchVizHandler.FIELDS.score]
        );

        GameSearchVizHandler.KEYS.forEach(key => {
            if (!this._data.has(key)) {
                this._data.set(key, {
                    games: 0,
                    percent: 0
                });
            }
        });

        this._data = new d3.InternMap(d3.sort(this._data, d => -d[0]));

        this._stacks = d3.stack()
            .keys(GameSearchVizHandler.KEYS)
            .value((d, key) => d.get(key).percent)
            ([this._data]);
    }

    _buildPlot() {
        // scales
        this._xScale = this._createXScale(
            [0, 1],
            [0, this._options.plotWidth]
        );
        this._colorScale = d3.scaleOrdinal()
            .domain(GameSearchVizHandler.KEYS)
            .range([
                this._options.colors.white,
                this._options.colors.draw,
                this._options.colors.black
            ]);
        this._highlightScale = d3.scaleOrdinal()
            .domain(GameSearchVizHandler.KEYS)
            .range([
                this._options.highlights.white,
                this._options.highlights.draw,
                this._options.highlights.black
            ]);

        // rects
        this._rects = this._plot.append("g");

        // tooltip
        this._tooltip = this._createTooltip();
    }

    updatePlot() {
        // rects
        this._rects.selectAll("rect")
            .data(this._stacks)
            .join(
                enter => enter.append("rect")
                    .attr("x", d => this._xScale(d[0][0]))
                    .attr("y", 0)
                    .attr("height", this._options.plotHeight)
                    .attr("width", d => this._xScale(d[0][1]) - this._xScale(d[0][0]))
                    .style("fill", d => this._colorScale(d.key)),

                update => update.transition()
                    .duration(1000)
                    .attr("x", d => this._xScale(d[0][0]))
                    .attr("width", d => this._xScale(d[0][1]) - this._xScale(d[0][0]))
            )
            .on('mouseover', this._mouseover)
            .on('mousemove', this._mouseover)
            .on('mouseout', this._mouseout);

        // spans
        d3.select(this._valuesElement).selectAll("span")
            .data(this._data)
            .join(
                enter => enter.append("span")
                    .attr("class", ([score, d]) => {
                        if (score == 1) {
                            return "white";
                        } else if (score == 0) {
                            return "black";
                        } else {
                            return "draw";
                        }
                    })
                    .text(([score, d]) => `${d.percent.toFixed(2)}%`),

                update => update.transition()
                    .duration(1000)
                    .text(([score, d]) => `${d.percent.toFixed(2)}%`)
            )

    }

    // mouse events
    _mouseover = (evt, d) => {
        var rect = d3.select(evt.target);
        var key = d.key;
        var result;
        switch (d.key) {
            case 1:
                result = "1-0";
                break;
            case 0:
                result = "0-1";
                break;
            case 0.5:
                result = "1/2-1/2";
                break;
        }
        var text = `Resultado: ${result}<br>Partidas: ${this._data.get(key).games}`;

        rect.transition()
            .duration(50)
            .style("fill", this._highlightScale(key));

        this._displayTooltip(this._tooltip, text, evt);
    }

    _mouseout = (evt, d) => {
        var rect = d3.select(evt.target);
        var key = d.key;

        rect.transition()
            .duration(50)
            .style("fill", this._colorScale(key));

        this._hideTooltip(this._tooltip);
    }
}