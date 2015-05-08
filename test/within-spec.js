describe('within-parsing', function() {

	var DateData ;

	beforeEach(module('datetime.bootstrap', function($provide) {
	  	$provide.value('$log', console);
	})) ;

	beforeEach(function() {
		inject(function ($injector) {
			DateData = $injector.get('DateData') ;
		}) ;
	}) ;

	it("Should parse within values correctly", function() {

		var within = DateData.parseWithin("1 week") ;
		expect(within.direction).toEqual('future') ;

		within = DateData.parseWithin("1 week ago") ;
		expect(within.direction).toEqual('past') ;

	}) ;
	
}) 