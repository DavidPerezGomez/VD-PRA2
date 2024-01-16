class LichessDataHandler {

    constructor() {
        this._loadedGames = false;
        this._loadedMoves = false;
        this._cache = {
            next: {}
        };
        this._cache_lock = false;
        this._options = {
            useCache: true,
            cacheDepth: 4,
            maxMoves: 10,
        };
    }

    dataMain(games) {
        this._data = games;
        this._loadedGames = true;

        return this;
    }

    async dataMoves(gameMoves) {
        if (this._loadedGames) {
            await this._parseGameMoves(gameMoves);
            this._loadedMoves = true;
        }

        return this;
    }

    async _parseGameMoves(gameMoves) {
        if (this._parsingMovesLock) {
            return;
        }
        this._parsingMovesLock = true;

        if (this._data.length != gameMoves.length) {
            throw new Error(`Wrong number of games: ${gameMoves.length} (expected ${this._data.length})`);
        }

        console.log("parsing moves");

        var t0 = Date.now();

        await this._parseGameMovesIter(gameMoves);

        var t1 = Date.now();

        console.log(`finisherd parsing moves in ${t1 - t0}`);

        this._parsingMovesLock = false;
    }

    async _parseGameMovesIter(gameMoves, idx = 0) {
        var batch = 25000;
        var timeout = 80;

        var j = 0;
        while (idx < this._data.length && j < batch) {
            this._data[idx].Moves = this._splitMoves(gameMoves[idx].Moves);
            idx++;
            j++;
        }

        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        console.log(`${100 * idx / this._data.length}%`);
        if (idx < this._data.length) {
            await delay(timeout);
            await this._parseGameMovesIter(gameMoves, idx);
        }
    }

    _splitMoves(moves) {
        var nChars = 4 * this._options.maxMoves;
        var movesHead = moves.substr(0, nChars);
        var firstMoves = movesHead.split(" ");
        return firstMoves.slice(0, this._options.maxMoves);
    }

    getAllWithFields(...fields) {
        return this._selectFields(this._data, ...fields);
    }

    getSampleWithFields(n, ...fields) {
        var sample = _.sample(this._data, n);
        return this._selectFields(sample, ...fields);
    }

    getGamesByMoves(moveList, useCache = this._options.useCache) {
        if (!this._loadedMoves) {
            throw new Error("Game moves haven't been loaded yet.");
        }

        if (moveList.length > this._options.maxMoves) {
            moveList = moveList.slice(0, this._options.maxMoves);
        }

        if (useCache) {
            if (this._cache_lock) {
                throw -1;
            }
            this._cache_lock = true;
        }

        // get initial set of games to search
        var cacheLevel;
        var level;
        var gameIndices;
        if (useCache) {
            // cached games
            [cacheLevel, level] = this._getCachedDataset(moveList);
            if (level == 0) {
                gameIndices = [...this._data.keys()];
            } else {
                gameIndices = cacheLevel.games;
            }
        } else {
            // all games
            cacheLevel = this._cache;
            level = 0;

            gameIndices = [...this._data.keys()];
        }

        // find games that match the moves
        moveList = moveList.slice(level);
        for (let move of moveList) {
            let newIndices = this._getGameIndicesByNextMove(gameIndices, move, level);

            // cache games
            if (useCache &&
                move &&
                level >= level &&
                level < this._options.cacheDepth) {

                if (!cacheLevel.next) {
                    cacheLevel.next = {};
                }

                if (!cacheLevel.next[move]) {
                    cacheLevel.next[move] = { games: newIndices }
                }

                cacheLevel = cacheLevel.next[move];
            }
            level++;

            gameIndices = newIndices;
        }

        if (useCache) {
            this._cache_lock = false;
        }

        return this._getGamesByIndices(gameIndices);
    }

    _getGameIndicesByNextMove(indices, move, n) {
        var games = this._getGamesByIndices(indices);

        var subIndices = [];
        for (let i = 0; i < games.length; i++) {
            let game = games[i];
            if (n < game.Moves.length && game.Moves[n].replace(/[\+#]/g, "") == move) {
                subIndices.push(i);
            }
        }

        var newIndices = subIndices.map(x => indices[x]);

        return newIndices
    }

    _getGamesByIndices(indices) {
        return indices.map(x => this._data[x]);
    }

    _getCachedDataset(moveList) {
        var cacheLevel = this._cache;
        var level = 0;
        var move = moveList[level]

        while (cacheLevel.next && move in cacheLevel.next && level < this._options.cacheDepth) {
            cacheLevel = cacheLevel.next[move];
            level++;
            move = moveList[level];
        }

        return [cacheLevel, level];
    }

    _selectFields(data, ...fields) {
        return data.map(game => {
            return fields.reduce((accResult, field) => {
                accResult[field] = game[field];
                return accResult;
            }, {});
        });
    }

}

export { LichessDataHandler };