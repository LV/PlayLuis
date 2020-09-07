$("#SetFen").click(function () {
	var fenStr = $("#fenIn").val(); // .val() will get value of whatever is inside the textbox
	NewGame(fenStr);
});

$("#TakeButton").click( function () {
	if(GameBoard.hisply > 0) {
		TakeMove();
		GameBoard.ply = 0;
		SetInitialBoardPieces();	// erase board to start
	}
});

$("#NewGameButton").click( function () {
	NewGame(START_FEN);
});

function NewGame(fenStr) {
	ParseFen(fenStr);
	PrintBoard();
	SetInitialBoardPieces();
	CheckAndSet();
}

function ClearAllPieces() {
	$(".Piece").remove();
}

function SetInitialBoardPieces() {
	var sq, sq120, file, rank, rankName, fileName, imgString, pieceImgName, piece;

	ClearAllPieces();

	for(sq = 0; sq < 64; sq++) {
		sq120 = SQ120(sq);
		piece = GameBoard.pieces[sq120];
		if(piece >= PIECES.wP && piece <=PIECES.bK) {
			AddGUIPiece(sq120, piece);
		}
	}
}

function DeSelectSquare(sq) {
	$(".Square").each( function(index) {
		if(PieceIsOnSquare(sq, $(this).position().top, $(this).position().left)) {
			$(this).removeClass("SqSelected");
		}
	});
}

function SetSquareSelected(sq) {
	$(".Square").each( function(index) {
		if(PieceIsOnSquare(sq, $(this).position().top, $(this).position().left)) {
			$(this).addClass("SqSelected");
		}
	});
}

function ClickedSquare(pageX, pageY) {
	console.log("ClickedSquare at " + pageX + "," + pageY);
	var position = $("#Board").position();		// gives us the absolute position of the board

	// using Math.floor to remove decimal points
	var workedX = Math.floor(position.left);	// tells us how far off from the left are we
	var workedY = Math.floor(position.top);		// tells us how far oof from the top are we

	pageX = Math.floor(pageX);
	pageY = Math.floor(pageY);

	var file = Math.floor((pageX - workedX) / 60);
	var rank = 7 - Math.floor((pageY - workedY) / 60);	// ranks are flipped upside down so the 7 is needed

	var sq = FR2SQ(file, rank);

	console.log("Clicked sq:" + PrSq(sq));

	SetSquareSelected(sq);

	return sq;
}

$(document).on("click", ".Piece", function (e) {
	console.log("Piece Click");

	if(UserMove.from == SQUARES.NO_SQ) UserMove.from = ClickedSquare(e.pageX, e.pageY);
	else UserMove.to = ClickedSquare(e.pageX, e.pageY);
	MakeUserMove();
});

$(document).on("click", ".Square", function (e) {
	console.log("Square Click");
	if(UserMove.from != SQUARES.NO_SQ) {
		UserMove.to = ClickedSquare(e.pageX, e.pageY);
		MakeUserMove();
	}
});

function MakeUserMove() {
	if(UserMove.from != SQUARES.NO_SQ && UserMove.to != SQUARES.NO_SQ) {

		console.log("User Move: " + PrSq(UserMove.from) + PrSq(UserMove.to));

		var parsed = ParseMove(UserMove.from, UserMove.to);

		if(parsed != NOMOVE) {
			MakeMove(parsed);
			PrintBoard();
			MoveGUIPiece(parsed);
			CheckAndSet();
			PreSearch();
		}

		DeSelectSquare(UserMove.from);
		DeSelectSquare(UserMove.to);

		UserMove.from = SQUARES.NO_SQ;
		UserMove.to = SQUARES.NO_SQ;
	}
}

function PieceIsOnSquare(sq, top, left) {
	if((RanksBrd[sq] == (7 - Math.round(top/60))) && (FilesBrd[sq] == Math.round(left/60))) {
		return true;
	} else return false;
}

function RemoveGUIPiece(sq) {
	$(".Piece").each( function(index) {
		if(PieceIsOnSquare(sq, $(this).position().top, $(this).position().left)) {
			$(this).remove();
		}
	});
}

function AddGUIPiece(sq, piece) {

	var file = FilesBrd[sq];
	var rank = RanksBrd[sq];
	rankName = "rank" + (rank + 1);
	fileName = "file" + (file + 1);
	var pieceImgName = "img/" + SideChar[PieceCol[piece]] + PceChar[piece].toUpperCase() + ".png";
	var imgString = "<image src=\"" + pieceImgName + "\" class=\"Piece " + rankName + " " + fileName + "\"/>";
	$("#Board").append(imgString);
}

function MoveGUIPiece(move) {
	var from = FROMSQ(move);
	var to = TOSQ(move);

	// en passant
	if(move & MFLAGEP) {
		var epRemove;
		if(GameBoard.side == COLORS.BLACK) {
			epRemove = to - 10;	// remove piece behind as it is black being en-passanted
		} else {
			epRemove = to + 10;	// ahead as it is white
		}
		RemoveGUIPiece(epRemove);
	} else if(CAPTURED(move)) {
		RemoveGUIPiece(to);
	}

	var file = FilesBrd[to];
	var rank = RanksBrd[to];
	rankName = "rank" + (rank + 1);
	fileName = "file" + (file + 1);

	$(".Piece").each( function(index) {
		if(PieceIsOnSquare(from, $(this).position().top, $(this).position().left)) {
			$(this).removeClass();
			$(this).addClass("Piece " + rankName + " " + fileName);
		}
	});

	// castling
	if(move & MFLAGCA) {
		switch(to) {
			case SQUARES.G1: RemoveGUIPiece(SQUARES.H1); AddGUIPiece(SQUARES.F1, PIECES.wR); break;
			case SQUARES.C1: RemoveGUIPiece(SQUARES.A1); AddGUIPiece(SQUARES.D1, PIECES.wR); break;
			case SQUARES.G8: RemoveGUIPiece(SQUARES.H8); AddGUIPiece(SQUARES.F8, PIECES.bR); break;
			case SQUARES.C8: RemoveGUIPiece(SQUARES.A8); AddGUIPiece(SQUARES.D8, PIECES.bR); break;
		}
	} else if(PROMOTED(move)) {
		RemoveGUIPiece(to);
		AddGUIPiece(to, PROMOTED(move));
	}
}

function DrawMaterial() {
	// if there are pawns, queens, or rooks then game is not drawn
	if((GameBoard.pceNum[PIECES.wP] != 0) || (GameBoard.pceNum[PIECES.bP] != 0)) return false;
	if((GameBoard.pceNum[PIECES.wQ] != 0) || (GameBoard.pceNum[PIECES.bQ] != 0)) return false;
	if((GameBoard.pceNum[PIECES.wR] != 0) || (GameBoard.pceNum[PIECES.bR] != 0)) return false;

	// if either side has 2 or more knights/bishops then game is not drawn
	if((GameBoard.pceNum[PIECES.wB] > 1) || (GameBoard.pceNum[PIECES.bB] > 1)) return false;
	if((GameBoard.pceNum[PIECES.wN] > 1) || (GameBoard.pceNum[PIECES.bN] > 1)) return false;

	// if either side has a knight and a bishop then game is not drawn
	if((GameBoard.pceNum[PIECES.wN] != 0) && (GameBoard.pceNum[PIECES.wB] != 0)) return false;
	if((GameBoard.pceNum[PIECES.bN] != 0) && (GameBoard.pceNum[PIECES.bB] != 0)) return false;

	return true;
}

function ThreeFoldRep() {
	var i = 0;
	var r = 0;
	for(i = 0; i < GameBoard.hisply; ++i) {
		if(GameBoard.history[i].posKey == GameBoard.posKey) {
			r++; 
		}
	}
	return r;
}

function togglePopup(){
	document.getElementById("popup-1").classList.toggle("active");
}

function CheckResult() {
	if(GameBoard.fiftyMove >= 100) {
		$("#GameStatus").text["GAME DRAWN (Fifty Move Rule)"];
		$("#statusHeading").replaceWith( "<div id=\"statusHeading\"><h1>Draw!</h1></div>" );
		$("#statusContent").replaceWith( "<div id=\"statusContent\"><p>You have drawn after 50 meaningless moves</p></div>" );
		togglePopup();

		$("#cardStatus").replaceWith( "<div class=\"card text-white bg-warning mb-3\" style=\"max-width: 20rem;\"><div class=\"card-body\"><h4 class=\"card-title\">Draw</h4><p class=\"card-text\">After a hard fought game, there's been no blood. Up for another game?</p></div>" );
		return true;
	}

	if(ThreeFoldRep() >= 2) {
		$("#GameStatus").text["GAME DRAWN (Three-fold repetition)"];
		$("#statusHeading").replaceWith( "<div id=\"statusHeading\"><h1>Draw!</h1></div>" );
		$("#statusContent").replaceWith( "<div id=\"statusContent\"><p>You have drawn after 3 consecutive repeated moves</p></div>" );
		togglePopup();

		$("#cardStatus").replaceWith( "<div class=\"card text-white bg-warning mb-3\" style=\"max-width: 20rem;\"><div class=\"card-body\"><h4 class=\"card-title\">Draw</h4><p class=\"card-text\">It looks like there was too much to lose for both of you. No one's come on top this time, up for another game?</p></div>" );
		return true;
	}

	if(DrawMaterial()) {
		$("#GameStatus").text["GAME DRAWN (Insufficient material to win)"];
		$("#statusHeading").replaceWith( "<div id=\"statusHeading\"><h1>Draw!</h1></div>" );
		$("#statusContent").replaceWith( "<div id=\"statusContent\"><p>It is impossible for anyone to win given the current amount of pieces left</p></div>" );
		togglePopup();

		$("#cardStatus").replaceWith( "<div class=\"card text-white bg-warning mb-3\" style=\"max-width: 20rem;\"><div class=\"card-body\"><h4 class=\"card-title\">Draw</h4><p class=\"card-text\">After a bloody battle, no one's come on top. Up for another round?</p></div>" );
		return true;
	}

	GenerateMoves();
	var MoveNum = 0;
	var found = 0;

	for(MoveNum = GameBoard.moveListStart[GameBoard.ply]; MoveNum < GameBoard.moveListStart[GameBoard.ply + 1]; ++MoveNum) {
		if(!MakeMove(GameBoard.moveList[MoveNum])) {
			continue;
		}
		
		found++;
		TakeMove();
		break;
	}

	if(found != 0) return false;

	// from this point onwards, there are no moves
	var InCheck = SqAttacked(GameBoard.pList[PCEINDEX(Kings[GameBoard.side], 0)], GameBoard.side^1);	// is one side in check, if so then there is a checkmate
	if(InCheck) {
		if(GameBoard.side == COLORS.WHITE) {
			$("#GameStatus").text("GAME OVER (Black wins)");
			$("#statusHeading").replaceWith( "<div id=\"statusHeading\"><h1>You Lost</h1></div>" );
			$("#statusContent").replaceWith( "<div id=\"statusContent\"><p>Luisito comes out on top</p></div>" );
			togglePopup();

			$("#cardStatus").replaceWith( "<div class=\"card text-white bg-danger mb-3\" style=\"max-width: 20rem;\"><div class=\"card-body\"><h4 class=\"card-title\">You Lose</h4><p class=\"card-text\">An absolute masterclass of a performance from Luis. No need to worry, there's always next game.</p></div>" );
			return true;
		} else {
			$("#GameStatus").text("GAME OVER (White wins)");
			$("#statusHeading").replaceWith( "<div id=\"statusHeading\"><h1>You Win!</h1></div>" );
			$("#statusContent").replaceWith( "<div id=\"statusContent\"><p>Wow! Great moves, keep it up. Proud of you.</p></div>" );
			togglePopup();

			$("#cardStatus").replaceWith( "<div class=\"card text-white bg-success mb-3\" style=\"max-width: 20rem;\"><div class=\"card-body\"><h4 class=\"card-title\">You Win!</h4><p class=\"card-text\">And just like that, Luis' reign of terror has come to an end, congrats! Send me a screenshot of this page and I'll be sure to personally play you.</p></div>" );
			return true;
		}
	} else {
		$("#GameStatus").text("GAME DRAWN (Stalemate)");
		$("#statusHeading").replaceWith( "<div id=\"statusHeading\"><h1>Stalemate!</h1></div>" );
		$("#statusContent").replaceWith( "<div id=\"statusContent\"><p>There are no legal moves for Luis and he's not in check, meaning that the game is drawn.</p></div>" );
		togglePopup();

		$("#cardStatus").replaceWith( "<div class=\"card text-white bg-warning mb-3\" style=\"max-width: 20rem;\"><div class=\"card-body\"><h4 class=\"card-title\">Draw</h4><p class=\"card-text\">You've completely fucked that one up and thrown the game away. What a shame. Rematch?</p></div>" );
		return true;
	}
}

function CheckAndSet() {
	if(CheckResult()) {
		GameController.GameOver = true;
	} else {
		GameController.GameOver = false;
		$("#GameStatus").text("")
	}
}

function PreSearch() {
	if(!GameController.GameOver) {
		SearchController.thinking = true;
		setTimeout( function() { StartSearch(); }, 200);
	}
}

$("#SearchButton").click( function () {
	GameController.PlayerSide = GameController.side ^ 1;
	PreSearch();
});

function StartSearch() {
	SearchController.depth = MAXDEPTH;
	SearchController.time = parseInt(5) * 1000;	// in milliseconds
	SearchPosition();

	MakeMove(SearchController.best);
	MoveGUIPiece(SearchController.best);
	CheckAndSet();
}

// Timer
var blackTime = 0;
var whiteTime = 0;
setInterval(UpdateWhiteCounter, 1000);
setInterval(UpdateBlackCounter, 100);

function UpdateWhiteCounter() {
	if(GameBoard.side == COLORS.WHITE) {
		whiteTime++;
		minutes = Math.floor(whiteTime/60);
		seconds = whiteTime % 60;

		seconds = seconds < 10 ? "0" + seconds : seconds;
		minutes = minutes < 10 ? "0" + minutes : minutes;

		$("#whiteTimer").replaceWith( "<div id=\"whiteTimer\">" + minutes + ":" + seconds + "</div>" );
	}
}

/*
function UpdateBlackCounter() {
	if(GameBoard.side == COLORS.BLACK) {
		// The engine thinking completely fucks the timer up, for some reason blackTime increases by
		// intervals of 2 instead of counting up properly, so we have to apply a really shitty fix
		blackTime++;
		minutes = Math.floor(blackTime/120);
		seconds = Math.floor(blackTime/2) % 60;

		seconds = seconds < 10 ? "0" + seconds : seconds;
		minutes = minutes < 10 ? "0" + minutes : minutes;

		//$("#blackTimer").replaceWith( "<div id=\"blackTimer\">" + minutes + ":" + seconds + "</div>" );
		$("#blackTimer").replaceWith( "<div id=\"blackTimer\">" + minutes + ":" + seconds + "</div>" );
	}
}*/
