# Javascript-Object-to-Relational-Mapping

This is a smallish part of some production code for a mysql database based system that is on the web. The web interface is not shown here - this code focuses 
on real domain objects (user, etc) and mapping these down to relational tables.

It shows a graduated layering of code over the top of the *npm mysql* package - starting with a synchronous database module supporting transactions and 
moving up to supporting a generic domain object (which deals with the object to relational mapping issue) which is in turn the prototype (JS inheritance style) 
or "subclass" for real domain objects like User and Photo.

It also is intended as a worked example to support the architectural rules outlined in the following article: https://www.infoq.com/articles/arm-enterprise-applications/
which proposes five 'layers' or 'strata' within which modules should be placed - depending on what they do and the nature of the code they contain. The strata are 'interface', 'application', 'domain', 'infrastructure' and 'platform' - see the article for a full description.

It will help to understand the modular structure used here if you look at that.

## Files

[*infrastructure layer/strata*]
* ass.js - a custom assertion package
* utils.js - general purpose JS functions used on multiple projects

[*platform layer/strata* - code is provided by]
* the npm "mysql" package,
* the npm "wait.for" package. (Wait.for is interesting, its a bit like JS *await* - but predates it by a few years - and only runs in nodejs (requires fibers).
* nodejs - on which this system ran.
