import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faFacebook, faTwitter, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import { Link } from 'react-router-dom';
const Template = () => {
    return (
        <div className='flex justify-center min-h-screen bg-orange-200'>
            <div className="flex flex-col items-center w-full px-4 sm:px-8 md:px-16 lg:px-20">
                <div className="flex flex-row gap-6 sm:gap-8 md:gap-10 text-sm pt-10 font-bold">
                    <p>BIO</p>
                    <p>PORTFOLIO</p>
                    <p>POSTCAST</p>
                    <Link to={"/todoList"}>TODOLIST</Link>
                </div>
                <div className="flex flex-col md:flex-row border mt-10 mb-10 border-black w-full max-w-[700px]">
                    <div className="flex flex-col w-full">
                        <div className="text-left pl-6 pt-8">
                            <p className="text-5xl pb-3">Bethany Jones</p>
                            <p>Im a dedicated culture critic and blogger</p>
                            <p>located in San Francisco, California.</p>
                        </div>
                        <div className='pt-20'>
                            <p className="text-left pl-6 text-gray-700">@reallygreatsite</p>
                            <div className="flex gap-4 pl-6 pt-2 pb-10">
                                <FontAwesomeIcon icon={faInstagram} className="text-2xl" />
                                <FontAwesomeIcon icon={faFacebook} className="text-2xl" />
                                <FontAwesomeIcon icon={faTwitter} className="text-2xl" />
                                <FontAwesomeIcon icon={faLinkedin} className="text-2xl" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 md:mt-0">
                        <img src="/img/image.png" alt="Bethany Jones" className="w-[400px] md:w-[500px] h-full p-3" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Template
