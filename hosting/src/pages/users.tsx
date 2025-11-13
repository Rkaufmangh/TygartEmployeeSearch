import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Grid, GridColumn, GridDataStateChangeEvent, GridToolbar, GridSelectionChangeEvent } from '@progress/kendo-react-grid';
import { process, DataResult, State } from '@progress/kendo-data-query';
import { fetchUsersList } from '../firebase/users';
import { AuthContext } from '../logic/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@progress/kendo-react-buttons';
import {deleteUser} from '../firebase/users';

type AnyUser = {
  id?: string;
  uid?: string;
  email?: string;
  displayName?: string;
  phoneNumber?: string;
  [key: string]: any;
};

const Users: React.FC = () => {
  const { isAdmin } = useContext(AuthContext)!;
  const navigate = useNavigate();
  const [users, setUsers] = useState<AnyUser[]>([]);
  const [state, setState] = useState<State>({ skip: 0, take: 10, sort: [{ field: 'displayName', dir: 'asc' }], filter: undefined });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetchUsersList()
      .then((list) => {
        const arr = list as AnyUser[];
        setUsers(arr);
        setState((prev) => ({
          ...prev,
          // reset to first page but keep current page size
          skip: 0,
        }));
      })
      .catch(() => setUsers([]));
  }, [isAdmin]);

  const processed = useMemo<DataResult>(() => process(users, state), [users, state]);
  const itemsWithSelection = useMemo(() => {
    const items = (processed.data as AnyUser[]).map((u) => ({ ...u, selected: u.id === selectedId }));
    return items;
  }, [processed, selectedId]);

  const onDataStateChange = (e: GridDataStateChangeEvent) => {
    if (!e.dataState) return;
    const { filter, sort, skip, take } = e.dataState;
    setState((prev) => ({
      ...prev,
      filter: typeof filter !== 'undefined' ? filter : prev.filter,
      sort: sort || prev.sort,
      skip: typeof skip === 'number' ? skip : prev.skip,
      take: typeof take === 'number' ? take : prev.take,
    }));
  };

  const onSelectionChange = (e: GridSelectionChangeEvent) => {
    setSelectedId(Object.keys(e.select)[0]);
  };

  const refresh = () => {
    fetchUsersList()
      .then((list) => {
        const arr = list as AnyUser[];
        setUsers(arr);
        setState((prev) => ({
          ...prev,
          // reset to first page but keep current page size
          skip: 0,
        }));
      })
      .catch(() => setUsers([]));
  };

  const handleAdd = () => {
    navigate('/users/add');
  };

  const handleEdit = () => {
    if (!selectedId) { alert('Please select a user to edit.'); return; }
    const current = users.find((u) => u.id === selectedId);
    if (!current) { alert('Selected user not found'); return; }
    navigate('/users/edit', { state: { user: current } });
  };

  const handleDelete = async () => {
    if (!selectedId) { alert('Please select a user to delete.'); return; }
    if (!window.confirm('Are you sure you want to delete this user record?')) return;
    try {
      await deleteUser(selectedId);
      setSelectedId(null);
      refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to delete user.');
    }
  };

  return (
	 
    <div className="container mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Users</h2>
	  {isAdmin?
      <Grid
        data={itemsWithSelection}
		autoProcessData={true}
        total={processed.total}
        skip={state.skip}
        take={state.take}
        sort={state.sort}
        filter={state.filter as any}
        pageable={{ buttonCount: 4, pageSizes: [10, 20, 50] }}
        sortable
        filterable
        selectable={{ enabled: true, mode: 'single' }}
		navigatable={true}
        onDataStateChange={onDataStateChange}
        dataItemKey="id"
        onSelectionChange={onSelectionChange}
      >
        <GridToolbar>
          <Button themeColor={'primary'} type="button" onClick={handleAdd}>Add</Button>
          &nbsp;
          <Button themeColor={'primary'} type="button" onClick={handleEdit} disabled={!selectedId}>Edit</Button>
          &nbsp;
          <Button themeColor={'error'} type="button" onClick={handleDelete} disabled={!selectedId}>Delete</Button>
          &nbsp;
          <Button type="button" onClick={refresh}>Refresh</Button>
        </GridToolbar>
        <GridColumn field="id" title="UID"  hidden />
        <GridColumn field="displayName" title="Name"  />
        <GridColumn field="email" title="Email"/>
        <GridColumn field="disabled" title="Active" />
      </Grid>: <></>}
    </div> 
  );
};

export default Users;
