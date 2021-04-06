# Javascript-Object-to-Relational-Mapping

This is a smallish part of some production code for a mysql database based system that is on the web. The web interface is not shown here - this code focuses 
on real domain objects (user, etc) and mapping these down to relational tables.

It shows a graduated layering of code over the top of the *npm mysql* package - starting with a synchronous database module supporting transactions and 
moving up to supporting a generic domain object (which deals with the object to relational mapping issue) which is in turn the prototype (JS inheritance style) 
or "subclass" for real domain objects like User and Photo.

It also is intended as a worked example to support the architectural rules outlined in the following article: 
'''
https://www.infoq.com/articles/arm-enterprise-applications/
'''
which proposes five 'layers' or 'strata' within which modules should be placed - depending on what they do and the nature of the code they contain. The strata are 'interface', 'application', 'domain', 'infrastructure' and 'platform' - see the article for a full description.

It will help to understand the modular structure used here if you look at that.

## Source files and their position in the layer/strata orderinging 
(Layers/strata are shown top to bottom here as per the diagram in the article above).



[*domain layer/strata*]
TBD.

[*infrastructure layer/strata*]
* DomainObject.js - a generic and 'abstract' infrastructure object than can be prototypically inherited from by all real domain objects. It provides the core structure for loading and saving objects from and to the database. It also manages lazy loading of .domain objects from tables in the DB.
* dbtxwrap.js - a small transaction-handling wrapper on top of *db.js* - managed commits and rollbacks, etc. Again pretty automatically.
* db.js - a general purpose SQL database helper package managing connection pooling and providing functions to make SQL queries and updates easy to do. It exports a 'pseudo-synchronous' interface (in the same way that modern JS 'await' is pseudo-synchonous). It also deals with optimistic locking and timestamps pretty automatically - much to the relief of higher level modules (which don't then have to worry about this - its all encapsulated and grubby details are hidden - as they should be!).
* ass.js - a custom assertion package
* utils.js - general purpose JS functions used on multiple projects

[*platform layer/strata* - code is provided by]
* the npm "mysql" package,
* the npm "wait.for" package (which saved me from callback hell). *Wait.for* is interesting, its a bit like JS *await* - but predates it by a few years - and only runs in nodejs (it requires nodejs fibers)].
* nodejs - on which this system was based.
