"use strict";

var Table = require( './table.js' );

var TableMgr = module.exports;

TableMgr.m_tbl = {};
TableMgr.m_eye_tbl = {};
TableMgr.m_feng_tbl = {};
TableMgr.m_feng_eye_tbl = {};

TableMgr.Init = function()
{
    for ( var i =0; i < 4; i++ )
    {
        this.m_tbl[ i ] = new Table();
        this.m_tbl[ i ].init();
    }

    for ( var i =0; i < 4; i++ )
    {
        this.m_eye_tbl[ i ] = new Table();
        this.m_eye_tbl[ i ].init();
    }

    for ( var i =0; i < 4; i++ )
    {
        this.m_feng_tbl[ i ] = new Table();
        this.m_feng_tbl[ i ].init();
    }

    for ( var i =0; i < 4; i++ )
    {
        this.m_feng_eye_tbl[ i ] = new Table();
        this.m_feng_eye_tbl[ i ].init();
    }
};

TableMgr.getTable = function( gui_num, eye, chi )
{

    var tbl = null;
    if ( chi ) 
    {
        if ( eye ) 
        {
            tbl = this.m_eye_tbl[ gui_num ];
        }else{
             tbl = this.m_tbl[ gui_num ];
        }
    } 
    else 
    {
      
        if ( eye ) 
        {
            tbl = this.m_feng_eye_tbl[ gui_num ];
        }else{
            tbl = this.m_feng_tbl[ gui_num ];
        }
    }
    return tbl;
};

TableMgr.Add = function( key, gui_num, eye, chi) 
{
    var tbl = this.getTable( gui_num, eye, chi );
    if( tbl )
    {
        tbl.add( key );
    }
};

TableMgr.check = function( key, gui_num, eye, chi ) 
{
    var tbl = this.getTable( gui_num, eye, chi );

    if( !tbl ) return false;
    
    return tbl.check( key );
};

TableMgr.LoadTable = function()
{
    for( var i = 0; i < 4; i ++ )
    {
        var name = `table_${i}.tbl`;
        this.m_tbl[ i ].load( name );
    //    console.log("加载文件["+name+"]Size="+this.m_tbl[i].length);
    }

    for( var i = 0; i < 4; i ++ )
    {
        var name = `eye_table_${i}.tbl`;
        this.m_eye_tbl[ i ].load( name );
        // console.log("加载文件[" + name + "]Size=" + this.m_eye_tbl[i].length);
    }
};

TableMgr.LoadFengTable=function()
{
    for(var i=0;i<4;i++){
        var name = `feng_table_${i}.tbl`;
        this.m_feng_tbl[i].load(name);
        // console.log("加载文件[" + name + "]Size=" + this.m_feng_tbl[i].length);
    }
     for ( var i = 0; i < 4; i++ )
    {
        var name = `feng_eye_table_${i}.tbl`;
        this.m_feng_eye_tbl[ i ].load( name );
        //  console.log("加载文件[" + name + "]Size=" + this.m_feng_eye_tbl[i].length);
    }
}