/** Model file path for current plugin **/
const modelPath     = 	__dirname+"/model/examinations";
const modulePath	= 	"/"+ADMIN_NAME+"/examinations/";
const examinaitons =   require(modelPath);

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
    req.rendering.views	=	__dirname + "/views";
    next();
});

/** Routing is used to get list **/
app.all(modulePath,checkLoggedInAdmin,(req, res,next) => {
    examinaitons.getList(req, res,next);
});

/** Routing is used to view questions **/
app.all(modulePath+"view/:id/:page?",checkLoggedInAdmin,(req,res,next) => {
    examinaitons.viewQuestions(req,res,next);
});

/** Routing is used to generate exam link  **/
app.all(modulePath+'link/:id?',checkLoggedInAdmin,(req, res,next) => {
    examinaitons.generateExamLink(req,res,next);
});

/** Routing is used to view result **/
app.all(modulePath+"result/:id/:page?",checkLoggedInAdmin,(req,res,next) => {
    examinaitons.viewResult(req,res,next);
});

/** Routing is used to share result **/
app.all(modulePath+"share_result/:user_id/:result",checkLoggedInAdmin,(req,res,next) => {
    examinaitons.shareResult(req,res,next);
});

/** Routing is used to update answer **/
app.get(modulePath+"update_answer/:question_id/:exam_id",checkLoggedInAdmin,(req,res,next) => {
    examinaitons.updateQuestionAnswer(req,res,next);
});

