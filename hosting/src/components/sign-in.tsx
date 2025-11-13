import { Link, useNavigate } from 'react-router-dom';
import { signInWithGoogle, loginWithEmailPassword } from '../firebase/firebase';
import { AiFillGoogleCircle } from 'react-icons/ai';
import { Form, Field, FormElement, FieldWrapper } from '@progress/kendo-react-form';
import { Label, Error } from '@progress/kendo-react-labels';
import { Input } from '@progress/kendo-react-inputs';
import { Button } from '@progress/kendo-react-buttons';

const required = (value?: string) => !value ? 'This field is required' : '';
const emailValidator = (value?: string) => {
  if (!value) return 'Email is required';
  const ok = /.+@.+\..+/.test(value);
  return ok ? '' : 'Enter a valid email';
};

const TextField = (fieldRenderProps: any) => {
  const { validationMessage, visited, label, id, valid, ...others } = fieldRenderProps;
  const showError = visited && validationMessage;
  return (
    <FieldWrapper>
      <Label editorId={id}>{label}</Label>
      <Input {...others} />
      {showError && <Error>{validationMessage}</Error>}
    </FieldWrapper>
  );
};

const SignInForm = () => {
  const navigate = useNavigate();

  const onSubmit = (dataItem: { [k: string]: any }) => {
    const { email, password } = dataItem;
    return loginWithEmailPassword({ email, password })
      .then(() => navigate('/profile'))
      .catch(() => {/* show error toast if desired */});
  };

  const handleGoogleSignIn = () => {
    signInWithGoogle()
      .then(() => navigate('/profile'))
      .catch(() => {/* show error toast if desired */});
  };

  return (
    <div className="max-w-xl mx-auto my-20 px-4">
      <h1 className="text-3xl font-extrabold text-center mb-4 text-gray-900">Sign in to your account</h1>
      <div className="bg-white border rounded py-8 px-8">
        <div className="mt-4">
          <Button onClick={handleGoogleSignIn} style={{ width: '100%' }}>
            Sign in with Google&nbsp; <AiFillGoogleCircle size={20} />
          </Button>
        </div>
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or sign in with</span>
            </div>
          </div>
          <br />
          <Form
            onSubmit={onSubmit}
            render={(formProps) => (
              <FormElement>
                <Field name={'email'} label={'Email address'} component={TextField} validator={emailValidator} />
                <Field name={'password'} label={'Password'} type={'password'} component={TextField} validator={required} />
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm">
                    <Link to="/forgot" className="font-medium text-blue-600 hover:text-blue-500">Forgot Password?</Link>
                  </div>
                </div>
                <Button type={'submit'} themeColor={'primary'} disabled={!formProps.allowSubmit} style={{ width: '100%' }}>
                  Sign In
                </Button>
              </FormElement>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default SignInForm;
