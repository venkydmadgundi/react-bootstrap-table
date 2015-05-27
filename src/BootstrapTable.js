import React from 'react';
import classSet from 'classnames';
import Const from './Const';
import TableHeader from './TableHeader';
import TableBody from './TableBody';
import PaginationList from './pagination/PaginationList';
import ToolBar from './toolbar/ToolBar';
import TableFilter from './TableFilter';
import TableDataStore from './store/TableDataStore';

class BootstrapTable extends React.Component{

  constructor(props) {
		super(props);

    if(this.props.cellEdit){
      this.props.cellEdit.__onCompleteEdit__ = this.handleEditCell.bind(this);
      if(this.props.cellEdit.mode !== Const.CELL_EDIT_NONE)
        this.props.selectRow.clickToSelect = false;
    }
    this.sortTable = false;
    this.order = Const.SORT_DESC;
    this.sortField = null;
    let keyField = null;
    this.props.children.forEach(function(column){
      if(column.props.dataSort) this.sortTable = true;
      if(column.props.isKey){
        if(keyField != null) throw "Error. Multiple key column be detected in TableHeaderColumn.";
        keyField = column.props.dataField;
      }
    }, this);
    if(keyField == null)
      throw "Error. No any key column defined in TableHeaderColumn. Use 'isKey={true}' to specify an unique column after version 0.5.4.";

    this.store = new TableDataStore(this.props.data, this.props.pagination, keyField);
    let result = [];
    if(this.props.pagination){
      result = this.store.page(1, Const.SIZE_PER_PAGE).get();
    } else{
      result = this.store.get();
    }
    this.state = {
      data: result
    };
	}

  // componentWillMount(){
  //   // if(this.props.pagination){
  //   //   // this.handlePaginationData(1, Const.SIZE_PER_PAGE);
  //   //   this.store.page(1, Const.SIZE_PER_PAGE).get();
  //   // } else{
  //   //   this.store.get();
  //   // }
  // }

  componentDidMount(){
    this._adjustHeaderWidth();
  }

  componentDidUpdate(){
    this._adjustHeaderWidth();
  }

  render(){
    var tableClass = classSet("react-bs-table");
    var style = {
      height: this.props.height
    };
    var columns = this.props.children.map(function(column, i){
      return {
        name: column.props.dataField,
        align: column.props.dataAlign,
        sort: column.props.dataSort,
        format: column.props.dataFormat,
        editable: column.props.editable,
        index: i
      };
    }, this);

    var pagination = this.renderPagination();
    var toolBar = this.renderToolBar();
    return(
      <div className="react-bs-container">
        {toolBar}
        <div ref="table" style={style} className={tableClass}>
          <TableHeader rowSelectType={this.props.selectRow.mode}
                       onSort={this.handleSort.bind(this)}
                       onSelectAllRow={this.handleSelectAllRow.bind(this)}>
            {this.props.children}
          </TableHeader>
          <TableBody ref="body" data={this.state.data} columns={columns}
            striped={this.props.striped}
            hover={this.props.hover}
            keyField={this.store.getKeyField()}
            condensed={this.props.condensed}
            selectRow={this.props.selectRow}
            cellEdit={this.props.cellEdit}
            enableFilter={this.props.columnFilter}/>
          <TableFilter columns={columns}
                       rowSelectType={this.props.selectRow.mode}
                       onFilter={this.handleFilterData.bind(this)}/>
        </div>
        {pagination}
      </div>
    )
  }

  handleSort(order, sortField){
    // this.order = order;
    // this.sortField = sortField;
    //
    // if(this.props.pagination){
    //   let sizePerPage = this.refs.pagination.getSizePerPage();
    //   let currentPage = this.refs.pagination.getCurrentPage();
    //   this.handlePaginationData(currentPage,sizePerPage);
    // }else{
    //   this.props.data = this._sort(this.props.data, this.order, this.sortField);
    //   this.setState({data: this.props.data});
    // }

    let result = this.store.sort(order, sortField).get();
    this.setState({
      data: result
    });
  }

  handlePaginationData(page, sizePerPage){
    if(this.sortTable && null != this.sortField)
      this.props.data = this._sort(this.props.data, this.order, this.sortField);
    var end = page*sizePerPage-1;
    var start = end - (sizePerPage - 1);
    var arr = [];
    for(var i=start;i<=end;i++){
      arr.push(this.props.data[i]);
      if(i+1 == this.props.data.length)break;
    }
    this.setState({data: arr});
  }

  handleSelectAllRow(e){
    var isSelected = e.currentTarget.checked;
    if(isSelected){
      let selectedKey = this.props.data.map(function(row){
        return row[this.store.getKeyField()];
      }, this);
      this.props.selectRow.__onSelectAll__(selectedKey);
    }else{
      this.props.selectRow.__onSelectAll__([]);
    }
  }

  handleEditCell(newVal, rowIndex, colIndex){
    let fieldName;
    this.props.children.forEach(function(column, i){
      if(i == colIndex){
        fieldName = column.props.dataField;
        return false;
      }
    });

    let result = this.store.edit(newVal, rowIndex, fieldName).get();
    this.setState({
      data: result
    });

    if(this.props.cellEdit.afterSaveCell){
      this.props.cellEdit.afterSaveCell(this.state.data[rowIndex], fieldName, newVal);
    }
  }

  handleAddRow(newObj){
    let msg = null, result;
    try {
      this.store.add(newObj);
    } catch(e){
      return e;
    }

    if(this.props.pagination){
      //if pagination is enabled and insert row be trigger, change to last page
      let sizePerPage = this.refs.pagination.getSizePerPage();
      let currLastPage = Math.ceil(this.store.getDataNum()/sizePerPage);
      console.log(currLastPage +"," + sizePerPage);
      result = this.store.page(currLastPage, sizePerPage).get();
      this.setState({
        data: result
      });
      this.refs.pagination.changePage(currLastPage);
    } else{
      result = this.store.get();
      this.setState({
        data: result
      });
    }
  }

  handleDropRow(){
    var selectedRowKey = this.refs.body.getSelectedRowKeys();
    this.props.data = this.props.data.filter(function(row){
      return selectedRowKey.indexOf(row[this.keyField]) == -1;
    }, this);

    if(this.props.pagination){
      let sizePerPage = this.refs.pagination.getSizePerPage();
      let currLastPage = Math.ceil(this.props.data.length/sizePerPage);
      let currentPage = this.refs.pagination.getCurrentPage();

      if(currentPage > currLastPage)
        currentPage = currLastPage;

      this.handlePaginationData(currentPage,sizePerPage);
      this.refs.pagination.changePage(currentPage);
    }else{
      this.setState({data: this.props.data});
    }
  }

  handleFilterData(filterObj){
    console.log(filterObj);
    // TODO: not yet impoements
    var filteredResult = this.props.data.filter(function(row){
      let valid = true;
      for(var key in filterObj){
        if(row[key].indexOf(filterObj[key]) == -1){
          valid = false;
          break;
        }
      }
      return valid;
    });
    if(this.props.pagination){
      let sizePerPage = this.refs.pagination.getSizePerPage();
      let currLastPage = Math.ceil(filteredResult.length/sizePerPage);
      this.handlePaginationData(1, sizePerPage);
      this.refs.pagination.changePage(1);
    }
  }

  _sort(arr, order, sortField){
    arr.sort(function(a,b){
      if(order == Const.SORT_ASC){
        return a[sortField] > b[sortField]?-1: ((a[sortField] < b[sortField]) ? 1 : 0);
      }else{
        return a[sortField] < b[sortField]?-1: ((a[sortField] > b[sortField]) ? 1 : 0);
      }
    });
    return arr;
  }

  _adjustHeaderWidth(){
    this.refs.table.getDOMNode().childNodes[0].childNodes[0].style.width =
      this.refs.table.getDOMNode().childNodes[1].childNodes[0].offsetWidth-1+"px";
  }

  renderPagination(){
    if(this.props.pagination){
      return(
        <div>
          <PaginationList ref="pagination"
                          changePage={this.handlePaginationData.bind(this)}
                          sizePerPage={Const.SIZE_PER_PAGE}
                          dataSize={this.props.data.length} />
        </div>
      )
    }else {
      return null;
    }
  }

  renderToolBar(){
    let columns = this.props.children.map(function(column){
      return {
        name: column.props.children,
        field: column.props.dataField
      };
    });
    if(this.props.insertRow || this.props.deleteRow || this.props.search){
      return(
        <div className="tool-bar">
          <ToolBar enableInsert={this.props.insertRow}
                   enableDelete={this.props.deleteRow}
                   enableSearch={this.props.search}
                   columns={columns}
                   onAddRow={this.handleAddRow.bind(this)}
                   onDropRow={this.handleDropRow.bind(this)}/>
        </div>
      )
    }else{
      return null;
    }
  }
}
BootstrapTable.propTypes = {
  height: React.PropTypes.string,
  data: React.PropTypes.array,
  striped: React.PropTypes.bool,
  hover: React.PropTypes.bool,
  condensed: React.PropTypes.bool,
  pagination: React.PropTypes.bool,
  selectRow: React.PropTypes.shape({
    mode: React.PropTypes.string,
    bgColor: React.PropTypes.string,
    onSelect: React.PropTypes.func,
    onSelectAll: React.PropTypes.func,
    clickToSelect: React.PropTypes.bool
  }),
  cellEdit: React.PropTypes.shape({
    mode: React.PropTypes.string,
    blurToSave: React.PropTypes.bool,
    afterSaveCell: React.PropTypes.func
  }),
  insertRow: React.PropTypes.bool,
  deleteRow: React.PropTypes.bool,
  search: React.PropTypes.bool,
  columnFilter: React.PropTypes.bool
};
BootstrapTable.defaultProps = {
  height: "100%",
  striped: false,
  hover: false,
  condensed: false,
  pagination: false,
  selectRow: {
    mode: Const.ROW_SELECT_NONE,
    bgColor: Const.ROW_SELECT_BG_COLOR,
    onSelect: undefined,
    onSelectAll: undefined,
    clickToSelect: false
  },
  cellEdit:{
    mode: Const.CELL_EDIT_NONE,
    blurToSave: false,
    afterSaveCell: undefined
  },
  insertRow: false,
  deleteRow: false,
  search: false,
  columnFilter: false
};

export default BootstrapTable;
