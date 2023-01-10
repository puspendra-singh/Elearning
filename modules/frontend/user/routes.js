/** Model file path for current plugin **/
const modelPath     =	__dirname+"/model/user";
const user	        =   require(modelPath);

/** Routing is used to user signup **/
routes.post(API_URL+"signup",(req,res,next)=>{
    user.signup(req,res,next);
});

/** Routing is used to phone verificaton **/
routes.post(API_URL+"phone_verification",(req,res,next)=>{
    user.phoneVerification(req,res,next);
});

/** Routing is used to resend otp **/
routes.post(API_URL+"resend_otp",(req,res,next)=>{
    user.resendOtp(req,res,next);
});

/** Routing is used to resend email **/
routes.post(API_URL+"resend_email",(req,res,next)=>{
    user.resendEmail(req,res,next);
});

/** Routing is used to forgot password **/
routes.post(API_URL+"forgot_password",(req,res,next)=>{
    user.forgotPassword(req,res,next);
});

/** Routing is used to reset_password **/
routes.post(API_URL+"reset_password",(req,res,next)=>{
    user.resetPassword(req,res,next);
});

/** Routing is used to get user login **/
routes.post(API_URL+"signin",(req,res,next)=>{
    user.login(req,res,next);
});

/** Routing is used to get user login **/
routes.post(API_URL+"logout",(req,res,next)=>{
    user.logOut(req,res,next);
});

/** Routing is used to log out other user **/
routes.post(API_URL+"logout_other",(req,res,next)=>{
    user.logOutOther(req,res,next);
});

/** Routing is used to get notifications **/
routes.post(API_URL+"notifications",isUserLogedInApi,(req,res,next)=>{
    user.notifications(req,res,next);
});

/** Routing is used to update notification status **/
routes.post(API_URL+"notification_update",isUserLogedInApi,(req,res,next)=>{
    user.notificationUpdate(req,res,next);
});

/** Routing is used to get user data **/
routes.post(API_URL+"user_detail",isUserLogedInApi,(req,res,next)=>{
    user.getUserDetail(req,res,next);
});

/** Routing is used to edit user data **/
routes.post(API_URL+"edit_profile",isUserLogedInApi,(req,res,next)=>{
    user.updateProfile(req,res,next);
});

/** Routing is used to get other resources  **/
routes.get(API_URL+"other_resources/:page",(req,res,next)=>{
    user.getOtherResources(req,res,next);
});

/** Routing is used to get levels **/
routes.get(API_URL+"master/:dropdown_type",(req,res,next)=>{
    user.getMasters(req,res,next);
});

/** Routing is used to get subjects **/
routes.post(API_URL+"subjects",(req,res,next)=>{
    user.getSubjects(req,res,next);
});

/** Routing is used to get video lesson **/
routes.post(API_URL+"video_lessons",(req,res,next)=>{
    user.getVideoLesson(req,res,next);
});

/** Routing is used to get units **/
routes.post(API_URL+"units",(req,res,next)=>{
    user.getUnits(req,res,next);
});

/** Routing is used to get unit documents **/
routes.post(API_URL+"unit_documents",(req,res,next)=>{
    user.getUnitDocuments(req,res,next);
});

/** Routing is used to get past papers **/
routes.post(API_URL+"past_papers",(req,res,next)=>{
    user.getPastPapers(req,res,next);
});

/** Routing is used to get subscription list **/
routes.get(API_URL+"subscription_plans/:level",(req,res,next)=>{
    user.getSubscriptionPlas(req,res,next);
});

/** Routing is used to get faq list **/
routes.get(API_URL+"faq",(req,res,next)=>{
    user.getFaq(req,res,next);
});

/** Routing is used to get exams list **/
routes.post(API_URL+"exams",isUserLogedInApi,(req,res,next)=>{
    user.getExamList(req,res,next);
});

/** Routing is used to get exams list **/
routes.post(API_URL+"exam_questions",isUserLogedInApi,(req,res,next)=>{
    user.getExamDetail(req,res,next);
});

/** Routing is used to purchase plan **/
routes.post(API_URL+"purchase_plan",(req,res,next)=>{
    user.purchasePlan(req,res,next);
});

/** Routing is used to exam submission **/
routes.post(API_URL+"exam_submission",isUserLogedInApi,(req,res,next)=>{
    user.examSubmission(req,res,next);
});

/** Routing is used to check payment status **/
routes.post(API_URL+"check_payment_status",(req,res,next)=>{
    user.checkPaymentStatus(req,res,next);
});

/** Routing is used to update plan status **/
routes.get(API_URL+"update_plan_status",(req,res,next)=>{
    user.updatePlanStatus(req,res,next);
});

