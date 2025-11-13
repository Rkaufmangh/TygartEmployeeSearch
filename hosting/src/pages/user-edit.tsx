import React, { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../logic/AuthContext';
import { db } from '../firebase/firebase';
import { addDoc, collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { Form, Field, FormElement, FieldWrapper, FieldRenderProps } from '@progress/kendo-react-form';
import { Label, Error } from '@progress/kendo-react-labels';
import { Input, Switch } from '@progress/kendo-react-inputs';
import { MultiSelect } from '@progress/kendo-react-dropdowns';
import { Button } from '@progress/kendo-react-buttons';
import { AnyUser } from '../models/tygart-user';


const UserEdit: React.FC = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const location = useLocation() as { state?: { user?: AnyUser } };
  const params = useParams();

  const fromState = location.state?.user;

  const [user, setUser] = useState<AnyUser>({
    id: fromState?.id,
    uid: fromState?.uid,
    email: fromState?.email || '',
    displayName: fromState?.displayName || '',
    phoneNumber: fromState?.phoneNumber || '',
    disabled: !!fromState?.disabled,
    roles: Array.isArray(fromState?.roles) ? (fromState!.roles as string[]) : (fromState?.role ? [fromState.role] : (fromState?.isAdmin ? ['admin'] : [])),
  });

  // If routed with a path param id, try to load that user
  useEffect(() => {
    const id = params.id;
    if (!id || fromState) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', id));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as AnyUser;
          setUser({
            id: data.id,
            uid: (data as any).uid || data.id,
            email: data.email || '',
            displayName: data.displayName || '',
            phoneNumber: data.phoneNumber || '',
            disabled: !!data.disabled,
            roles: Array.isArray(data.roles) ? data.roles : (data.role ? [data.role] : (data.isAdmin ? ['admin'] : [])),
          });
        }
      } catch {}
    })();
  }, [params.id, fromState]);

  useEffect(() => {
    if (auth && !auth.isAdmin) navigate('/profile');
  }, [auth?.isAdmin, navigate]);

  const defaultRoleOptions = ['admin', 'editor', 'user'];

  const onSave = async (dataItem: any) => {
    const formUser: AnyUser = {
      id: user.id,
      uid: dataItem.uid || user.uid || user.id,
      email: dataItem.email || '',
      displayName: dataItem.displayName || '',
      phoneNumber: dataItem.phoneNumber || '',
      disabled: !!dataItem.disabled,
      roles: Array.isArray(dataItem.roles) ? dataItem.roles : [],
      isAdmin: Array.isArray(dataItem.roles) ? dataItem.roles.includes('admin') : false,
    };
    try {
      // remove undefined fields to prevent Firestore errors
      const clean: any = {};
      Object.keys(formUser).forEach((k) => {
        const v = (formUser as any)[k];
        if (v !== undefined) clean[k] = v;
      });

      if (clean.id) {
        await setDoc(doc(db, 'users', clean.id), clean, { merge: true });
      } else {
        // do not include an undefined id when creating
        const { id: _omit, ...createPayload } = clean;
        const ref = await addDoc(collection(db, 'users'), createPayload);
        setUser((prev) => ({ ...prev, id: ref.id }));
      }
      navigate('/users');
    } catch (err) {
      console.error(err);
      alert('Failed to save user');
    }
  };

  const onCancel = () => navigate('/users');

  // Field renderers
  const TextField = (fieldProps: FieldRenderProps) => {
    const { label, id, validationMessage, touched, visited, ...others } = fieldProps as any;
    const showError = (touched || visited) && validationMessage;
    return (
      <FieldWrapper>
        <Label editorId={id}>{label}</Label>
        <Input {...others} />
        {showError && <Error>{validationMessage}</Error>}
      </FieldWrapper>
    );
  };

  const RolesField = (fieldProps: FieldRenderProps) => {
    const { label, id, value, onChange } = fieldProps as any;
    const roles: string[] = Array.isArray(value) ? value : [];
    const [options, setOptions] = useState<string[]>(() => Array.from(new Set([...(roles || []), ...defaultRoleOptions])));
    useEffect(() => {
      setOptions((prev) => Array.from(new Set([...(roles || []), ...prev])));
    }, [roles.join('|')]);
    return (
      <FieldWrapper>
        <Label editorId={id}>{label}</Label>
        <MultiSelect
          id={id}
          data={options}
          value={roles}
          onChange={(e) => onChange({ value: (e.value as string[]) || [], target: { name: fieldProps.name } })}
          allowCustom
          placeholder={'Select or type roles'}
        />
      </FieldWrapper>
    );
  };

  const DisabledField = (fieldProps: FieldRenderProps) => {
    const { label, value, onChange, name } = fieldProps as any;
    return (
      <div className="flex items-center space-x-2">
        <Switch checked={!!value} onChange={(e) => onChange({ value: e.value, target: { name } })} />
        <span>{label}</span>
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-2xl mt-10">
      <h2 className="text-2xl font-semibold mb-4">{user.id ? 'Edit User' : 'Add User'}</h2>
      <Form
        onSubmit={(data) => onSave(data)}
        initialValues={{
          uid: user.uid || user.id || '',
          displayName: user.displayName || '',
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          disabled: !!user.disabled,
          roles: user.roles || [],
        }}
        render={(formProps) => (
          <FormElement>
            <div className="space-y-4">
              <Field name={'displayName'} label={'Display Name'} component={TextField} />
              <Field name={'email'} label={'Email'} component={TextField} />
              <Field name={'phoneNumber'} label={'Phone'} component={TextField} />
              <Field name={'disabled'} label={'Active'} component={DisabledField} />
              <Field name={'roles'} label={'Roles'} component={RolesField} />
              <div className="space-x-2 mt-4">
                <Button themeColor={'primary'} disabled={!formProps.allowSubmit} type={'submit'}>Save</Button>
                <Button type={'button'} onClick={onCancel}>Cancel</Button>
              </div>
            </div>
          </FormElement>
        )}
      />
    </div>
  );
};

export default UserEdit;
