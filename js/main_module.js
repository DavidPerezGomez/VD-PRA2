import { LichessDataHandler } from "./lichess_data_handler.js";
import { GameSearchVizHandler } from "./game_search_handler.js";
import { TerminationVizHandler } from "./termination_plot_handler.js";
import { MovesVizHandler } from "./moves_plot_handler.js";
import { ScoreVizHandler } from "./score_plot_handler.js";
import { OpeningVizHandler } from "./opening_plot_handler.js";

const imgPath = "./img/chesspieces/wikipedia";
// const dataPathsMain = ["./res/2015-01_lichess_post_main.csv", "./res/2015-02_lichess_post_main.csv"];
// const dataPathsMoves = ["./res/2015-01_lichess_post_moves.csv", "./res/2015-02_lichess_post_moves.csv"];
const dataPathsMain = ["./res/sample_01_main.csv", "./res/sample_02_main.csv"];
const dataPathsMoves = ["./res/sample_01_moves.csv", "./res/sample_02_moves.csv"];

const dataHandler = new LichessDataHandler();

const terminationHandler = new TerminationVizHandler();
const movesPlotHandler = new MovesVizHandler();
const scorePlotHandler = new ScoreVizHandler();
const openingVizHandler = new OpeningVizHandler();
const gameSearchHandler = new GameSearchVizHandler();

main();

function main() {
    var t0 = Date.now();

    setLoadingImage();

    Promise.all([
        Promise.all(dataPathsMain.map(dataPathMain => {
            console.log(`loading ${dataPathMain}`);
            return d3.csv(dataPathMain, d3.autoType).then(data => {
                let t1 = Date.now()
                console.log(`${dataPathMain} loaded in ${t1 - t0}`);
                return data;
            })
        })),
        Promise.all(dataPathsMoves.map(dataPathMoves => {
            console.log(`loading ${dataPathMoves}`);
            return d3.csv(dataPathMoves).then(data => {
                let t1 = Date.now()
                console.log(`${dataPathMoves} loaded in ${t1 - t0}`);
                return data;
            })
        })),
    ])
        .then(([dataMainList, dataMovesList]) => {
            var dataMain = dataMainList.reduce((acc, x) => acc.concat(x), []);
            var dataMoves = dataMovesList.reduce((acc, x) => acc.concat(x), []);

            dataHandler.dataMain(dataMain);

            finishLoadingMain();

            return dataHandler.dataMoves(dataMoves);
        })
        .then(() => {
            finishLoadingMoves();
        });
}

function setLoadingImage() {
    const pieceMap = ["p", "N", "B", "R", "Q", "K"];

    var rng = Math.floor(Math.random() * pieceMap.length);
    var piece = pieceMap[rng];
    var srcWhite = `${imgPath}/w${piece}.png`;
    var srcBlack = `${imgPath}/b${piece}.png`;

    $("#loadingImgMainWhite").attr("href", srcWhite);
    $("#loadingImgMovesWhite").attr("href", srcWhite);
    $("#loadingImgMainBlack").attr("href", srcBlack);
    $("#loadingImgMovesBlack").attr("href", srcBlack);
}

function finishLoadingMain() {
    createTerminationPlot();
    createMovesPlot();
    createScorePlot();
    createOpeningsPlot();

    $("#openingsRange").on("input", updateOpeningsRangeValue);
    updateOpeningsRangeValue();

    $("#mainContent").removeClass("hidden");

    $("#loadingWidgetMain").removeClass("loading");
    $("#loadingWidgetMoves").addClass("loading");
}

function finishLoadingMoves() {
    createGameSearch();

    $("#gameSearchBlock").removeClass("hidden");

    $("#loadingWidgetMoves").removeClass("loading");
}

function updateOpeningsRangeValue() {
    var text = openingVizHandler.getSelectedBracketRange();
    $("#openingsRangeValue").text(text);
}

function createTerminationPlot() {
    const terminationStyle = window.getComputedStyle($("#terminationBlock")[0]);

    const terminationOptions = {
        plotWidth: 700,
        plotHeight: 500,
        plotMargin: {
            top: 10,
            right: 110,
            bottom: 40,
            left: 80,
        },
        colors: {
            background: terminationStyle.getPropertyValue("--color-background"),
            checkmate: terminationStyle.getPropertyValue("--color-checkmate"),
            draw: terminationStyle.getPropertyValue("--color-draw"),
            resignation: terminationStyle.getPropertyValue("--color-resignation"),
            timeout: terminationStyle.getPropertyValue("--color-timeout"),
        },
        minEloBracket: 800,
        maxEloBracket: 2500,
        bracketSize: 50,
        minCount: 200,
    };

    terminationHandler.dataHandler(dataHandler)
        .plot("terminationPlot")
        .options(terminationOptions);

    terminationHandler.initializePlot()
        .updatePlot();
}

function createMovesPlot() {
    const movesStyle = window.getComputedStyle($("#movesBlock")[0]);

    const movesPlotOptions = {
        plotWidth: 700,
        plotHeight: 500,
        plotMargin: {
            top: 10,
            right: 20,
            bottom: 40,
            left: 60,
        },
        colors: {
            background: movesStyle.getPropertyValue("--color-background"),
            dots: movesStyle.getPropertyValue("--color-dots"),
            line: movesStyle.getPropertyValue("--color-line"),
        },
    };

    movesPlotHandler.dataHandler(dataHandler)
        .plot("movesPlot")
        .options(movesPlotOptions);

    movesPlotHandler.initializePlot()
        .updatePlot();
}

function createScorePlot() {
    const scoreStyle = window.getComputedStyle($("#scoreBlock")[0]);

    const scorePlotOptions = {
        plotWidth: 650,
        plotHeight: 500,
        plotMargin: {
            top: 10,
            right: 0,
            bottom: 40,
            left: 70,
        },
        colors: {
            background: scoreStyle.getPropertyValue("--board-dark"),
            dots: scoreStyle.getPropertyValue("--color-dots"),
            line: scoreStyle.getPropertyValue("--color-line"),
        },
        bracketSize: 10,
    };

    scorePlotHandler.dataHandler(dataHandler)
        .plot("scorePlot")
        .options(scorePlotOptions);

    scorePlotHandler.initializePlot()
        .updatePlot();
}

function createOpeningsPlot() {
    const openingsStyle = window.getComputedStyle($("#openingsBlock")[0]);

    const openingsPlotOptions = {
        plotWidth: 500,
        plotHeight: 500,
        plotMargin: {
            top: 10,
            right: 20,
            bottom: 40,
            left: 50,
        },
        colors: {
            background: openingsStyle.getPropertyValue("--color-background"),
            circles: openingsStyle.getPropertyValue("--color-circles"),
            text: openingsStyle.getPropertyValue("--color-text"),
        },
        circleSizeRange: [20, 20],
        bracketSize: 50,
        minCount: 200,
    };

    openingVizHandler.dataHandler(dataHandler)
        .plot("openingsPlot")
        .slider("openingsRange")
        .options(openingsPlotOptions);

    openingVizHandler.initializePlot()
        .updatePlot();
}

function createGameSearch() {
    const gameSearchStyle = window.getComputedStyle($("#gameSearchBlock")[0]);

    const gameSearchOptions = {
        plotWidth: 400,
        plotHeight: 100,
        colors: {
            white: gameSearchStyle.getPropertyValue("--color-white"),
            black: gameSearchStyle.getPropertyValue("--color-black"),
            draw: gameSearchStyle.getPropertyValue("--color-draw"),
        },
        highlights: {
            white: gameSearchStyle.getPropertyValue("--highlight-white"),
            black: gameSearchStyle.getPropertyValue("--highlight-black"),
            draw: gameSearchStyle.getPropertyValue("--highlight-draw"),
        },
        maxMoves: dataHandler._options.maxMoves,
    };

    gameSearchHandler.dataHandler(dataHandler)
        .board("board")
        .plot("gameSearchPlot")
        .values("gamesPercent")
        .options(gameSearchOptions);

    gameSearchHandler.initializePlot()
        .updatePlot();

    $("#btnSearch").on("click", () => {
        var input = $("#inputMoves").val();
        var res = gameSearchHandler.update(input);
        if (!res) {
            showInputError();
        } else {
            clearInputError();
        }
    });

    $("#openingsList").children().each((idx, li) => {
        $(li).on("click", () => {
            let value = $(li).attr("value");
            $("#inputMoves").val(value);
            $("#btnSearch").click();
        })
    })
}

function showInputError() {
    $("#inputMoves").addClass("error");
}

function clearInputError() {
    $("#inputMoves").removeClass("error");
}
